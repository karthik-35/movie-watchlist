"""
app.py — Flask application entry-point.

Routes
------
GET  /                     Home page (watchlist)
GET  /search               Search page
GET  /api/search           JSON: query TMDB for movies/TV shows
GET  /api/providers/<id>   JSON: fetch OTT providers for a title
POST /api/watchlist/add    JSON: add a title to the watchlist
POST /api/watchlist/toggle JSON: toggle watched/unwatched
POST /api/watchlist/rate   JSON: set a 1-5 star rating
POST /api/watchlist/remove JSON: remove a title from the watchlist
GET  /api/watchlist        JSON: return watchlist (optional ?filter=watched|unwatched)
"""

import os
import requests
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
import database as db

load_dotenv()  # pull TMDB_API_KEY and FLASK_SECRET_KEY from .env

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")

TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_KEY  = os.getenv("TMDB_API_KEY", "")

# Initialise the SQLite schema on startup
db.init_db()


# ---------------------------------------------------------------------------
# Page routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Render the main watchlist page."""
    return render_template("index.html")


@app.route("/search")
def search_page():
    """Render the search page."""
    return render_template("search.html")


# ---------------------------------------------------------------------------
# TMDB proxy helpers
# ---------------------------------------------------------------------------

def _tmdb_get(path, **params):
    """Make a GET request to TMDB and return the parsed JSON, or None on error."""
    params["api_key"] = TMDB_KEY
    try:
        resp = requests.get(f"{TMDB_BASE}{path}", params=params, timeout=8)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException:
        return None


# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------

@app.route("/api/search")
def api_search():
    """
    Search TMDB for movies and TV shows.
    Query param: q (search query), page (default 1)
    Returns combined and de-duped results with media_type attached.
    """
    query = request.args.get("q", "").strip()
    page  = request.args.get("page", 1, type=int)

    if not query:
        return jsonify({"results": [], "total_results": 0})

    # TMDB multi-search covers movies, TV shows, and people in one call
    data = _tmdb_get("/search/multi", query=query, page=page, include_adult=False)
    if not data:
        return jsonify({"error": "Failed to reach TMDB"}), 502

    # Keep only movie and tv results; attach media_type so the frontend knows
    results = [
        r for r in data.get("results", [])
        if r.get("media_type") in ("movie", "tv")
    ]

    return jsonify({
        "results":       results,
        "total_results": data.get("total_results", 0),
        "page":          data.get("page", 1),
        "total_pages":   data.get("total_pages", 1),
    })


@app.route("/api/providers/<int:tmdb_id>")
def api_providers(tmdb_id):
    """
    Fetch OTT streaming providers for a title using TMDB's watch/providers endpoint.
    Query param: media_type ('movie' or 'tv'), region (default 'US')
    Returns a list of flatrate (subscription) providers with logo URLs.
    """
    media_type = request.args.get("media_type", "movie")
    region     = request.args.get("region", "US")

    if media_type not in ("movie", "tv"):
        return jsonify({"error": "Invalid media_type"}), 400

    data = _tmdb_get(f"/{media_type}/{tmdb_id}/watch/providers")
    if not data:
        return jsonify({"providers": []})

    region_data = data.get("results", {}).get(region, {})

    # 'flatrate' = subscription streaming (Netflix, Prime, Disney+, etc.)
    # 'free' and 'ads' are also available but less useful for a watchlist app
    flatrate = region_data.get("flatrate", [])
    providers = [
        {
            "name":     p.get("provider_name"),
            "logo_url": f"https://image.tmdb.org/t/p/original{p['logo_path']}"
                        if p.get("logo_path") else None,
        }
        for p in flatrate
    ]

    return jsonify({"providers": providers})


@app.route("/api/watchlist", methods=["GET"])
def api_get_watchlist():
    """Return the full watchlist; accepts ?filter=watched or ?filter=unwatched."""
    filter_param = request.args.get("filter")
    if filter_param == "watched":
        items = db.get_all_items(filter_watched=True)
    elif filter_param == "unwatched":
        items = db.get_all_items(filter_watched=False)
    else:
        items = db.get_all_items()
    return jsonify({"items": items})


@app.route("/api/watchlist/add", methods=["POST"])
def api_add():
    """
    Add a TMDB title to the watchlist.
    Expects JSON body with: tmdb_id, media_type, title, poster_path,
                            overview, release_date, vote_average
    """
    data = request.get_json(force=True)
    required = ("tmdb_id", "media_type", "title")
    if not all(data.get(k) for k in required):
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
    return jsonify({"success": True, "message": f"'{data['title']}' added to watchlist"})


@app.route("/api/watchlist/toggle", methods=["POST"])
def api_toggle():
    """Toggle watched/unwatched status. Expects JSON: tmdb_id, media_type."""
    data = request.get_json(force=True)
    new_val = db.toggle_watched(data.get("tmdb_id"), data.get("media_type"))
    if new_val is None:
        return jsonify({"error": "Item not found"}), 404
    return jsonify({"success": True, "watched": bool(new_val)})


@app.route("/api/watchlist/rate", methods=["POST"])
def api_rate():
    """Set a star rating. Expects JSON: tmdb_id, media_type, rating (1-5)."""
    data   = request.get_json(force=True)
    rating = data.get("rating")
    if not isinstance(rating, int) or rating not in range(1, 6):
        return jsonify({"error": "Rating must be an integer 1-5"}), 400
    db.set_rating(data.get("tmdb_id"), data.get("media_type"), rating)
    return jsonify({"success": True, "rating": rating})


@app.route("/api/watchlist/remove", methods=["POST"])
def api_remove():
    """Remove an item from the watchlist. Expects JSON: tmdb_id, media_type."""
    data = request.get_json(force=True)
    db.remove_item(data.get("tmdb_id"), data.get("media_type"))
    return jsonify({"success": True})


if __name__ == "__main__":
    # Port 5000 is reserved by macOS AirPlay Receiver; use 5001 instead.
    app.run(debug=True, port=5001)
