"""
app.py — Netflix-style Movie Watchlist Flask app.

Page routes
-----------
GET  /                          Home (hero + rows)
GET  /movies                    Movies browse page
GET  /tv                        TV Shows browse page
GET  /popular                   Popular content page
GET  /browse/language/<lang>    Browse by language
GET  /search                    Search page
GET  /title/<type>/<id>         Detail page
GET  /mylist                    My watchlist

API routes
----------
GET  /api/trending              Trending movies + TV (TMDB weekly)
GET  /api/popular/<type>        Popular movies or TV
GET  /api/top-rated/<type>      Top-rated movies or TV
GET  /api/discover              Discover by language (?lang=hi&type=movie)
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
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
import database as db

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY  = os.getenv("TMDB_API_KEY", "")

LANGUAGE_NAMES = {
    "hi": "Hindi", "ko": "Korean", "es": "Spanish",
    "ja": "Japanese", "fr": "French", "it": "Italian",
    "de": "German", "ta": "Tamil", "zh": "Chinese",
}

db.init_db()


# ── Page routes ───────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/movies")
def movies_page():
    return render_template("browse.html", category="movies", page_title="Movies")

@app.route("/tv")
def tv_page():
    return render_template("browse.html", category="tv", page_title="TV Shows")

@app.route("/popular")
def popular_page():
    return render_template("browse.html", category="popular", page_title="Popular")

@app.route("/browse/language/<lang>")
def language_browse(lang):
    name = LANGUAGE_NAMES.get(lang, lang.upper())
    return render_template("browse.html", category=f"lang-{lang}", page_title=f"{name} Cinema")

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

def _tmdb_get(path, **params):
    params["api_key"] = TMDB_KEY
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


# ── API routes ────────────────────────────────────────────────────────────────

@app.route("/api/trending")
def api_trending():
    page = request.args.get("page", 1, type=int)
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
    lang       = request.args.get("lang", "hi")
    media_type = request.args.get("type", "movie")
    page       = request.args.get("page", 1, type=int)
    if media_type not in ("movie", "tv"):
        media_type = "movie"
    data = _tmdb_get(f"/discover/{media_type}",
                     with_original_language=lang,
                     sort_by="popularity.desc",
                     page=page)
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

    # Bundle everything into one TMDB call via append_to_response
    rating_endpoint = "release_dates" if media_type == "movie" else "content_ratings"
    data = _tmdb_get(
        f"/{media_type}/{tmdb_id}",
        append_to_response=f"credits,videos,watch/providers,{rating_endpoint},similar,recommendations",
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

    # Best trailer (official YouTube trailer first)
    videos  = data.get("videos", {}).get("results", [])
    trailer = next(
        (v for v in videos if v.get("type") == "Trailer" and v.get("site") == "YouTube"),
        next((v for v in videos if v.get("site") == "YouTube"), None),
    )

    # Top 20 cast members
    cast = [
        {
            "id":           m.get("id"),
            "name":         m.get("name"),
            "character":    m.get("character"),
            "profile_path": m.get("profile_path"),
        }
        for m in data.get("credits", {}).get("cast", [])[:20]
    ]

    # US streaming providers (subscription / flatrate)
    us = data.get("watch/providers", {}).get("results", {}).get("US", {})
    providers = [
        {
            "provider_id": p.get("provider_id"),
            "name":        p.get("provider_name"),
            "logo_url":    f"https://image.tmdb.org/t/p/original{p['logo_path']}"
                           if p.get("logo_path") else None,
        }
        for p in us.get("flatrate", [])
    ]

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
        "similar":        similar,
        "recommendations": recs,
    })


# ── Watchlist API ─────────────────────────────────────────────────────────────

@app.route("/api/providers/<int:tmdb_id>")
def api_providers(tmdb_id):
    """Lightweight provider endpoint used by search/browse card lazy-loader."""
    media_type = request.args.get("media_type", "movie")
    region     = request.args.get("region", "US")
    if media_type not in ("movie", "tv"):
        return jsonify({"providers": []})
    data = _tmdb_get(f"/{media_type}/{tmdb_id}/watch/providers")
    if not data:
        return jsonify({"providers": []})
    us        = data.get("results", {}).get(region, {})
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
    # Port 5000 is reserved by macOS AirPlay Receiver; use 5001 instead.
    app.run(debug=True, port=5001)
