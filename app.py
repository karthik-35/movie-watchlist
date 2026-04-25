"""
app.py — Netflix-style Movie Watchlist Flask app.

Page routes
-----------
GET  /                          Home (hero + rows)
GET  /movies                    Movies browse page
GET  /tv                        TV Shows browse page
GET  /popular                   Popular content page
GET  /browse/language           Redirect to /browse/language/en
GET  /browse/language/<lang>    Browse by language
GET  /search                    Search page
GET  /title/<type>/<id>         Detail page
GET  /mylist                    My watchlist

API routes
----------
GET  /api/trending              Trending movies + TV (TMDB weekly)
GET  /api/popular/<type>        Popular movies or TV
GET  /api/top-rated/<type>      Top-rated movies or TV
GET  /api/discover              Discover with full param support
GET  /api/search                Multi-search (?q=...&page=1)
GET  /api/detail/<type>/<id>    Full detail (credits, trailer, providers, similar)
GET  /api/watchlist             Watchlist items (?filter=watched|unwatched)
POST /api/watchlist/add         Add item
POST /api/watchlist/toggle      Toggle watched flag
POST /api/watchlist/rate        Set 1-5 star rating
POST /api/watchlist/remove      Remove item
"""

import os
import requests
from flask import Flask, jsonify, redirect, render_template, request
from dotenv import load_dotenv
import database as db

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY  = os.getenv("TMDB_API_KEY", "")

LANGUAGE_NAMES = {
    "hi": "Hindi",   "ko": "Korean",   "es": "Spanish",
    "ja": "Japanese", "fr": "French",   "it": "Italian",
    "de": "German",  "ta": "Tamil",    "zh": "Chinese",
    "te": "Telugu",  "ml": "Malayalam","ar": "Arabic",
    "da": "Danish",  "nl": "Dutch",    "tl": "Filipino",
    "he": "Hebrew",  "id": "Indonesian","ms": "Malay",
    "no": "Norwegian","pl": "Polish",   "pt": "Portuguese",
    "sv": "Swedish", "th": "Thai",     "tr": "Turkish",
    "vi": "Vietnamese",
}

ALL_LANGUAGES = [
    ("English",    "en"), ("Hindi",      "hi"), ("Telugu",    "te"),
    ("Tamil",      "ta"), ("Malayalam",  "ml"), ("Korean",    "ko"),
    ("Japanese",   "ja"), ("Spanish",    "es"), ("French",    "fr"),
    ("German",     "de"), ("Arabic",     "ar"), ("Danish",    "da"),
    ("Dutch",      "nl"), ("Filipino",   "tl"), ("Flemish",   "nl"),
    ("Hebrew",     "he"), ("Indonesian", "id"), ("Italian",   "it"),
    ("Malay",      "ms"), ("Mandarin",   "zh"), ("Norwegian", "no"),
    ("Polish",     "pl"), ("Portuguese", "pt"), ("Swedish",   "sv"),
    ("Thai",       "th"), ("Turkish",    "tr"), ("Vietnamese","vi"),
]

db.init_db()


# ── Page routes ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/movies")
def movies_page():
    return render_template("browse.html", category="movies", page_title="Movies",
                           is_language=False)

@app.route("/tv")
def tv_page():
    return render_template("browse.html", category="tv", page_title="TV Shows",
                           is_language=False)

@app.route("/popular")
def popular_page():
    return render_template("browse.html", category="popular", page_title="Popular",
                           is_language=False)

@app.route("/browse/language")
def language_browse_default():
    return redirect("/browse/language/en")

@app.route("/browse/language/<lang>")
def language_browse(lang):
    name     = LANGUAGE_NAMES.get(lang, lang.upper())
    lang_mode = request.args.get("mode", "original")
    return render_template("browse.html",
                           category=f"lang-{lang}",
                           page_title="Browse by Languages",
                           is_language=True,
                           lang_code=lang,
                           lang_name=name,
                           lang_mode=lang_mode,
                           all_languages=ALL_LANGUAGES)

@app.route("/search")
def search_page():
    return render_template("search.html")

@app.route("/title/<media_type>/<int:tmdb_id>")
def detail_page(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return "Not found", 404
    return render_template("detail.html", tmdb_id=tmdb_id, media_type=media_type)

@app.route("/mylist")
def mylist_page():
    return render_template("mylist.html")


# ── TMDB helpers ──────────────────────────────────────────────────────────────

def _tmdb_get(path, _extra=None, **params):
    """Call TMDB API. _extra handles dot-key params like vote_average.gte."""
    params["api_key"] = TMDB_KEY
    if _extra:
        params.update(_extra)
    try:
        resp = requests.get(f"{TMDB_BASE}{path}", params=params, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException:
        return None

def _tag_type(results, media_type):
    """Ensure every result dict has a media_type field."""
    for r in results:
        r.setdefault("media_type", media_type)
    return results

def _build_extra(vote_min=None, vote_cnt=None, date_from=None, date_to=None,
                 year_max=None, provider=None, origin_country=None,
                 series_type=None):
    """Build dot-key params that can't be passed as Python kwargs."""
    extra = {}
    if vote_min is not None:
        extra["vote_average.gte"] = vote_min
    if vote_cnt is not None:
        extra["vote_count.gte"] = vote_cnt
    if date_from:
        extra["primary_release_date.gte"] = date_from
    if date_to:
        extra["primary_release_date.lte"] = date_to
    if year_max:
        extra["primary_release_date.lte"] = f"{year_max}-12-31"
    if provider:
        extra["with_watch_providers"] = provider
        extra["watch_region"] = "US"
    if origin_country:
        extra["with_origin_country"] = origin_country
    if series_type:
        extra["with_type"] = series_type
    return extra


# ── API routes ────────────────────────────────────────────────────────────────

@app.route("/api/trending")
def api_trending():
    media_type = request.args.get("type")
    page = request.args.get("page", 1, type=int)

    if media_type in ("movie", "tv"):
        data = _tmdb_get(f"/trending/{media_type}/week", page=page)
        if not data:
            return jsonify({"error": "Failed to reach TMDB"}), 502
        results = _tag_type(data.get("results", []), media_type)
        return jsonify({"results": results, "total_pages": data.get("total_pages", 1)})

    # type=all or not specified
    data = _tmdb_get("/trending/all/week", page=page)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502
    results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]
    return jsonify({"results": results, "total_pages": data.get("total_pages", 1)})


@app.route("/api/popular/<media_type>")
def api_popular(media_type):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "Invalid type"}), 400
    page = request.args.get("page", 1, type=int)
    data = _tmdb_get(f"/{media_type}/popular", page=page)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502
    return jsonify({
        "results":     _tag_type(data.get("results", []), media_type),
        "total_pages": data.get("total_pages", 1),
    })


@app.route("/api/top-rated/<media_type>")
def api_top_rated(media_type):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "Invalid type"}), 400
    page = request.args.get("page", 1, type=int)
    data = _tmdb_get(f"/{media_type}/top_rated", page=page)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502
    return jsonify({
        "results":     _tag_type(data.get("results", []), media_type),
        "total_pages": data.get("total_pages", 1),
    })


@app.route("/api/discover")
def api_discover():
    lang           = request.args.get("lang")
    media_type     = request.args.get("type", "movie")
    genre          = request.args.get("genre")
    provider       = request.args.get("provider")
    sort_by        = request.args.get("sort", "popularity.desc")
    vote_min       = request.args.get("vote_min", type=float)
    vote_cnt       = request.args.get("vote_cnt", type=int)
    year_max       = request.args.get("year_max")
    date_from      = request.args.get("date_from")
    date_to        = request.args.get("date_to")
    exclude_lang   = request.args.get("exclude_lang")
    series_type    = request.args.get("series_type")
    origin_country = request.args.get("origin_country")
    page           = request.args.get("page", 1, type=int)

    # type=all → merge movie + tv results sorted by popularity
    if media_type == "all":
        extra_m = _build_extra(vote_min=vote_min, vote_cnt=vote_cnt,
                               date_from=date_from, date_to=date_to,
                               year_max=year_max, provider=provider,
                               origin_country=origin_country)
        extra_t = dict(extra_m)
        kwargs_m = dict(sort_by=sort_by, page=page)
        kwargs_t = dict(sort_by=sort_by, page=page)
        if lang:
            kwargs_m["with_original_language"] = lang
            kwargs_t["with_original_language"] = lang
        if genre:
            kwargs_m["with_genres"] = genre
            kwargs_t["with_genres"] = genre
        dm = _tmdb_get("/discover/movie", _extra=extra_m, **kwargs_m) or {"results": []}
        dt = _tmdb_get("/discover/tv",    _extra=extra_t, **kwargs_t) or {"results": []}
        movie_results = _tag_type(dm.get("results", []), "movie")
        tv_results    = _tag_type(dt.get("results", []), "tv")
        merged = sorted(movie_results + tv_results,
                        key=lambda r: r.get("popularity", 0), reverse=True)
        return jsonify({"results": merged,
                        "total_pages": max(dm.get("total_pages", 1), dt.get("total_pages", 1))})

    if media_type not in ("movie", "tv"):
        media_type = "movie"

    # Handle exclude_lang: fetch multiple pages and filter server-side
    if exclude_lang:
        all_results = []
        max_pages = 5
        for p in range(1, max_pages + 1):
            extra = _build_extra(vote_min=vote_min, vote_cnt=vote_cnt,
                                 date_from=date_from, date_to=date_to,
                                 year_max=year_max, provider=provider,
                                 origin_country=origin_country,
                                 series_type=(series_type if media_type == "tv" else None))
            kwargs = dict(sort_by=sort_by, page=p)
            if genre:
                kwargs["with_genres"] = genre
            data = _tmdb_get(f"/discover/{media_type}", _extra=extra, **kwargs)
            if not data:
                break
            results = _tag_type(data.get("results", []), media_type)
            filtered = [r for r in results
                        if r.get("original_language") != exclude_lang]
            all_results.extend(filtered)
            if len(all_results) >= 36:
                break
        return jsonify({"results": all_results[:36], "total_pages": 1})

    extra = _build_extra(vote_min=vote_min, vote_cnt=vote_cnt,
                         date_from=date_from, date_to=date_to,
                         year_max=year_max, provider=provider,
                         origin_country=origin_country,
                         series_type=(series_type if media_type == "tv" else None))
    kwargs = dict(sort_by=sort_by, page=page)
    if lang:
        kwargs["with_original_language"] = lang
    if genre:
        kwargs["with_genres"] = genre

    data = _tmdb_get(f"/discover/{media_type}", _extra=extra, **kwargs)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502
    return jsonify({
        "results":     _tag_type(data.get("results", []), media_type),
        "total_pages": data.get("total_pages", 1),
    })


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "").strip()
    page  = request.args.get("page", 1, type=int)
    if not query:
        return jsonify({"results": [], "total_results": 0})
    data = _tmdb_get("/search/multi", query=query, page=page, include_adult=False)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502
    results = [r for r in data.get("results", []) if r.get("media_type") in ("movie", "tv")]
    return jsonify({
        "results":       results,
        "total_results": data.get("total_results", 0),
        "page":          data.get("page", 1),
        "total_pages":   data.get("total_pages", 1),
    })


@app.route("/api/detail/<media_type>/<int:tmdb_id>")
def api_detail(media_type, tmdb_id):
    if media_type not in ("movie", "tv"):
        return jsonify({"error": "Invalid media_type"}), 400

    rating_endpoint = "release_dates" if media_type == "movie" else "content_ratings"
    data = _tmdb_get(
        f"/{media_type}/{tmdb_id}",
        _extra={"append_to_response": f"credits,videos,watch/providers,{rating_endpoint},similar,recommendations,external_ids"},
        language="en-US",
    )
    if not data:
        return jsonify({"error": "Title not found"}), 404

    # Content rating (US)
    content_rating = None
    if media_type == "movie":
        for entry in data.get("release_dates", {}).get("results", []):
            if entry.get("iso_3166_1") == "US":
                for rd in entry.get("release_dates", []):
                    if rd.get("certification"):
                        content_rating = rd["certification"]
                        break
                break
    else:
        for entry in data.get("content_ratings", {}).get("results", []):
            if entry.get("iso_3166_1") == "US":
                content_rating = entry.get("rating")
                break

    # Best trailer
    videos  = data.get("videos", {}).get("results", [])
    trailer = next(
        (v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"),
        next((v for v in videos if v.get("site") == "YouTube"), None),
    )

    # Top 20 cast
    cast = [
        {
            "id":           m.get("id"),
            "name":         m.get("name"),
            "character":    m.get("character"),
            "profile_path": m.get("profile_path"),
        }
        for m in data.get("credits", {}).get("cast", [])[:20]
    ]

    # US streaming providers + watch link
    us = data.get("watch/providers", {}).get("results", {}).get("US", {})
    watch_link = us.get("link")  # TMDB's own watch page
    providers = [
        {
            "provider_id": p.get("provider_id"),
            "name":        p.get("provider_name"),
            "logo_url":    f"https://image.tmdb.org/t/p/original{p['logo_path']}"
                           if p.get("logo_path") else None,
        }
        for p in us.get("flatrate", [])
    ]

    # External IDs (for deep-linking where available)
    ext = data.get("external_ids", {})
    external_ids = {k: v for k, v in ext.items() if v}

    languages = [l.get("english_name") for l in data.get("spoken_languages", []) if l.get("english_name")]
    runtime   = data.get("runtime") or next(iter(data.get("episode_run_time") or []), None)

    similar = _tag_type(data.get("similar", {}).get("results", [])[:18], media_type)
    recs    = _tag_type(data.get("recommendations", {}).get("results", [])[:18], media_type)

    return jsonify({
        "id":             data["id"],
        "media_type":     media_type,
        "title":          data.get("title") or data.get("name"),
        "tagline":        data.get("tagline", ""),
        "overview":       data.get("overview", ""),
        "poster_path":    data.get("poster_path"),
        "backdrop_path":  data.get("backdrop_path"),
        "release_date":   data.get("release_date") or data.get("first_air_date", ""),
        "runtime":        runtime,
        "vote_average":   data.get("vote_average"),
        "vote_count":     data.get("vote_count"),
        "genres":         data.get("genres", []),
        "content_rating": content_rating,
        "languages":      languages,
        "trailer":        trailer,
        "cast":           cast,
        "providers":      providers,
        "watch_link":     watch_link,
        "external_ids":   external_ids,
        "similar":        similar,
        "recommendations": recs,
    })


# ── Watchlist API ─────────────────────────────────────────────────────────────

@app.route("/api/providers/<int:tmdb_id>")
def api_providers(tmdb_id):
    media_type = request.args.get("media_type", "movie")
    region     = request.args.get("region", "US")
    if media_type not in ("movie", "tv"):
        return jsonify({"providers": []})
    data = _tmdb_get(f"/{media_type}/{tmdb_id}/watch/providers")
    if not data:
        return jsonify({"providers": []})
    us = data.get("results", {}).get(region, {})
    providers = [
        {
            "name":        p.get("provider_name"),
            "logo_url":    f"https://image.tmdb.org/t/p/original{p['logo_path']}" if p.get("logo_path") else None,
            "provider_id": p.get("provider_id"),
        }
        for p in us.get("flatrate", [])
    ]
    return jsonify({"providers": providers})


@app.route("/api/watchlist", methods=["GET"])
def api_get_watchlist():
    f = request.args.get("filter")
    items = (db.get_all_items(filter_watched=True)  if f == "watched"   else
             db.get_all_items(filter_watched=False) if f == "unwatched" else
             db.get_all_items())
    return jsonify({"items": items})


@app.route("/api/watchlist/add", methods=["POST"])
def api_add():
    data = request.get_json(force=True)
    if not all(data.get(k) for k in ("tmdb_id", "media_type", "title")):
        return jsonify({"error": "Missing required fields"}), 400
    db.add_item(
        tmdb_id      = data["tmdb_id"],
        media_type   = data["media_type"],
        title        = data["title"],
        poster_path  = data.get("poster_path"),
        overview     = data.get("overview", ""),
        release_date = data.get("release_date", ""),
        vote_average = data.get("vote_average"),
    )
    return jsonify({"success": True, "message": f"'{data['title']}' added to My List"})


@app.route("/api/watchlist/toggle", methods=["POST"])
def api_toggle():
    data    = request.get_json(force=True)
    new_val = db.toggle_watched(data.get("tmdb_id"), data.get("media_type"))
    if new_val is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify({"success": True, "watched": bool(new_val)})


@app.route("/api/watchlist/rate", methods=["POST"])
def api_rate():
    data   = request.get_json(force=True)
    rating = data.get("rating")
    if not isinstance(rating, int) or rating not in range(1, 6):
        return jsonify({"error": "Rating must be 1-5"}), 400
    db.set_rating(data.get("tmdb_id"), data.get("media_type"), rating)
    return jsonify({"success": True, "rating": rating})


@app.route("/api/watchlist/remove", methods=["POST"])
def api_remove():
    data = request.get_json(force=True)
    db.remove_item(data.get("tmdb_id"), data.get("media_type"))
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, port=5001)
