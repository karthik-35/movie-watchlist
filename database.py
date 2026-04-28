"""
database.py — SQLite setup and all DB helper functions.
Keeps all data-access logic out of app.py so routes stay thin.
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "watchlist.db")


def get_connection():
    """Return a connection with row_factory so rows behave like dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the watchlist table if it doesn't exist yet."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS watchlist (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                tmdb_id     INTEGER NOT NULL,
                media_type  TEXT    NOT NULL,          -- 'movie' or 'tv'
                title       TEXT    NOT NULL,
                poster_path   TEXT,
                backdrop_path TEXT,
                overview    TEXT,
                release_date TEXT,
                vote_average REAL,
                watched     INTEGER NOT NULL DEFAULT 0, -- 0 = unwatched, 1 = watched
                rating      INTEGER,                   -- user rating 1-5, NULL until rated
                added_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tmdb_id, media_type)            -- prevent duplicate entries
            )
        """)
        # Migrate existing databases that predate the backdrop_path column
        try:
            conn.execute("ALTER TABLE watchlist ADD COLUMN backdrop_path TEXT")
        except Exception:
            pass  # column already exists
        conn.commit()


# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------

def get_all_items(filter_watched=None):
    """
    Return all watchlist rows, optionally filtered by watched status.
    filter_watched: None = all, True = watched only, False = unwatched only.
    """
    with get_connection() as conn:
        if filter_watched is None:
            rows = conn.execute(
                "SELECT * FROM watchlist ORDER BY added_at DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM watchlist WHERE watched = ? ORDER BY added_at DESC",
                (1 if filter_watched else 0,)
            ).fetchall()
    return [dict(row) for row in rows]


def get_item(tmdb_id, media_type):
    """Fetch a single watchlist entry by TMDB id + media type."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM watchlist WHERE tmdb_id = ? AND media_type = ?",
            (tmdb_id, media_type)
        ).fetchone()
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Write helpers
# ---------------------------------------------------------------------------

def add_item(tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average):
    """Insert a new item; silently ignore if it's already in the list."""
    with get_connection() as conn:
        conn.execute("""
            INSERT OR IGNORE INTO watchlist
                (tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (tmdb_id, media_type, title, poster_path, backdrop_path, overview, release_date, vote_average))
        conn.commit()


def toggle_watched(tmdb_id, media_type):
    """Flip the watched flag and return the new value."""
    with get_connection() as conn:
        row = conn.execute(
            "SELECT watched FROM watchlist WHERE tmdb_id = ? AND media_type = ?",
            (tmdb_id, media_type)
        ).fetchone()
        if not row:
            return None
        new_val = 0 if row["watched"] else 1
        conn.execute(
            "UPDATE watchlist SET watched = ? WHERE tmdb_id = ? AND media_type = ?",
            (new_val, tmdb_id, media_type)
        )
        conn.commit()
    return new_val


def set_rating(tmdb_id, media_type, rating):
    """Save a 1-5 star rating for a watchlist entry."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE watchlist SET rating = ? WHERE tmdb_id = ? AND media_type = ?",
            (rating, tmdb_id, media_type)
        )
        conn.commit()


def remove_item(tmdb_id, media_type):
    """Delete an entry from the watchlist."""
    with get_connection() as conn:
        conn.execute(
            "DELETE FROM watchlist WHERE tmdb_id = ? AND media_type = ?",
            (tmdb_id, media_type)
        )
        conn.commit()
