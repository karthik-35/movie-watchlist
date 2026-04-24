/**
 * watchlist.js — renders the personal watchlist page with
 * filter tabs, stats, watched toggle, star rating, and remove.
 */

let activeFilter = "all";

const gridEl  = document.getElementById("watchlist-grid");
const emptyEl = document.getElementById("empty-state");
const statsEl = document.getElementById("stats-bar");

/** Load and render the watchlist whenever filter changes. */
async function loadWatchlist(filter = "all") {
  activeFilter = filter;
  gridEl.innerHTML = renderSkeletons(6);

  const url = filter === "all" ? "/api/watchlist" : `/api/watchlist?filter=${filter}`;
  try {
    const data = await fetch(url).then((r) => r.json());
    const items = data.items || [];
    renderStats(items);
    renderItems(items);
  } catch {
    gridEl.innerHTML = `<p style="color:var(--danger)">Failed to load watchlist.</p>`;
  }
}

function renderStats(items) {
  const total    = items.length;
  const watched  = items.filter((i) => i.watched).length;
  const rated    = items.filter((i) => i.rating).length;
  const avgRating = rated
    ? (items.reduce((s, i) => s + (i.rating || 0), 0) / rated).toFixed(1)
    : "–";

  statsEl.innerHTML = `
    <span><strong>${total}</strong> total</span>
    <span><strong>${watched}</strong> watched</span>
    <span><strong>${total - watched}</strong> to watch</span>
    ${rated ? `<span>avg rating <strong>${avgRating} ★</strong></span>` : ""}
  `;
}

function renderItems(items) {
  if (!items.length) {
    gridEl.innerHTML = "";
    emptyEl.style.display = "block";
    gridEl.appendChild(emptyEl);
    return;
  }
  emptyEl.style.display = "none";
  gridEl.innerHTML = items.map(renderWatchlistCard).join("");

  // Lazy-load providers for each card
  items.forEach((i) =>
    loadProviders(i.tmdb_id, i.media_type, `providers-${i.tmdb_id}-${i.media_type}`)
  );
}

function renderWatchlistCard(item) {
  const { tmdb_id, media_type, title, poster_path, release_date, vote_average, watched, rating } = item;

  const poster = poster_path
    ? `<img class="card-poster" src="${POSTER_BASE}${poster_path}" alt="${title}" loading="lazy">`
    : `<div class="card-poster-placeholder">🎬</div>`;

  const tmdbRating = vote_average ? vote_average.toFixed(1) : "–";
  const watchedBadge = watched ? `<div class="watched-badge">✓ Watched</div>` : "";
  const toggleLabel = watched ? "Mark Unwatched" : "Mark Watched";
  const toggleClass = watched ? "btn-ghost" : "btn-success";
  const detailUrl   = `/title/${media_type}/${tmdb_id}`;

  return `
<div class="card" id="wl-card-${tmdb_id}-${media_type}">
  ${watchedBadge}
  <a href="${detailUrl}" class="card-poster-link">${poster}</a>
  <div class="card-body">
    <a href="${detailUrl}" class="card-title-link">${title}</a>
    <div class="card-meta">
      <span class="badge">${media_type === "movie" ? "Movie" : "TV"}</span>
      <span>${releaseYear(release_date)}</span>
      <span class="tmdb-rating">⭐ ${tmdbRating}</span>
    </div>
    <div class="providers" id="providers-${tmdb_id}-${media_type}">
      <span class="skeleton" style="width:28px;height:28px;border-radius:6px;display:inline-block"></span>
    </div>
    ${renderStars(rating, tmdb_id, media_type)}
    <div class="card-actions">
      <button
        class="btn ${toggleClass} btn-sm"
        id="toggle-btn-${tmdb_id}-${media_type}"
        onclick="toggleWatched(${tmdb_id}, '${media_type}', this)"
      >${toggleLabel}</button>
      <button
        class="btn btn-danger btn-sm"
        onclick="removeItem(${tmdb_id}, '${media_type}')"
      >✕</button>
    </div>
  </div>
</div>`;
}

/** Toggle watched status and update card in place (no full reload). */
async function toggleWatched(tmdbId, mediaType, btn) {
  btn.disabled = true;
  const data = await apiPost("/api/watchlist/toggle", {
    tmdb_id: tmdbId, media_type: mediaType,
  });
  btn.disabled = false;

  if (!data.success) { showToast("Failed to update", "error"); return; }

  const card     = document.getElementById(`wl-card-${tmdbId}-${mediaType}`);
  const isWatched = data.watched;

  // Update button text/style
  btn.textContent = isWatched ? "Mark Unwatched" : "Mark Watched";
  btn.className   = `btn ${isWatched ? "btn-ghost" : "btn-success"} btn-sm`;

  // Add/remove watched badge
  let badge = card.querySelector(".watched-badge");
  if (isWatched && !badge) {
    badge = document.createElement("div");
    badge.className = "watched-badge";
    badge.textContent = "✓ Watched";
    card.prepend(badge);
  } else if (!isWatched && badge) {
    badge.remove();
  }

  showToast(isWatched ? "Marked as watched" : "Marked as unwatched", "success");

  // If a filter is active, remove the card from the visible list
  if (activeFilter === "watched" && !isWatched) card.remove();
  if (activeFilter === "unwatched" && isWatched)  card.remove();
}

/** Remove an item and fade its card out. */
async function removeItem(tmdbId, mediaType) {
  if (!confirm("Remove this title from your watchlist?")) return;

  const data = await apiPost("/api/watchlist/remove", {
    tmdb_id: tmdbId, media_type: mediaType,
  });

  if (data.success) {
    const card = document.getElementById(`wl-card-${tmdbId}-${mediaType}`);
    if (card) {
      card.style.transition = "opacity .3s";
      card.style.opacity = "0";
      card.addEventListener("transitionend", () => {
        card.remove();
        // Show empty state if no cards left
        if (!gridEl.querySelector(".card")) loadWatchlist(activeFilter);
      });
    }
    showToast("Removed from watchlist", "info");
  } else {
    showToast("Failed to remove", "error");
  }
}

function renderSkeletons(n) {
  return Array.from({ length: n }, () => `
<div class="card">
  <div class="skeleton" style="aspect-ratio:2/3;width:100%"></div>
  <div class="card-body" style="gap:.5rem">
    <div class="skeleton" style="height:14px;width:80%"></div>
    <div class="skeleton" style="height:12px;width:50%"></div>
    <div class="skeleton" style="height:24px;width:100%;margin-top:.5rem"></div>
  </div>
</div>`).join("");
}

// ── Filter tab wiring ─────────────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadWatchlist(btn.dataset.filter);
  });
});

// Initial load
loadWatchlist("all");
