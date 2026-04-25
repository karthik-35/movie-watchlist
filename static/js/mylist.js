/**
 * mylist.js — My List page: 6-column poster grid with hover overlay.
 */

let activeFilter = "all";

const gridEl  = document.getElementById("mylist-grid");
const emptyEl = document.getElementById("mylist-empty");
const statsEl = document.getElementById("mylist-stats");
const countEl = document.getElementById("mylist-count");

async function loadList(filter = "all") {
  activeFilter = filter;
  gridEl.innerHTML = skeletons(12);

  const url = filter === "all" ? "/api/watchlist" : `/api/watchlist?filter=${filter}`;
  try {
    const data  = await fetch(url).then((r) => r.json());
    const items = data.items || [];
    renderStats(items);
    renderItems(items);
  } catch {
    gridEl.innerHTML = `<p style="padding:2rem;color:var(--red)">Failed to load list.</p>`;
  }
}

function renderStats(items) {
  const total   = items.length;
  const watched = items.filter((i) => i.watched).length;
  const rated   = items.filter((i) => i.rating).length;
  const avg     = rated
    ? (items.reduce((s, i) => s + (i.rating || 0), 0) / rated).toFixed(1)
    : "–";

  if (countEl) countEl.textContent = total ? `${total} title${total === 1 ? "" : "s"}` : "";

  if (statsEl) statsEl.innerHTML = `
    <span><strong>${total}</strong> saved</span>
    <span><strong>${watched}</strong> watched</span>
    <span><strong>${total - watched}</strong> to watch</span>
    ${rated ? `<span>avg <strong>${avg} ★</strong></span>` : ""}
  `;
}

function renderItems(items) {
  if (!items.length) {
    gridEl.innerHTML = "";
    emptyEl.style.display = "flex";
    return;
  }
  emptyEl.style.display = "none";
  gridEl.innerHTML = items.map(renderMyListCard).join("");
}

function renderMyListCard(item) {
  const { tmdb_id, media_type, title, poster_path, release_date, vote_average, watched, rating } = item;
  const year  = (release_date || "").slice(0, 4);
  const score = vote_average ? vote_average.toFixed(1) : "–";

  const img = poster_path
    ? `<img class="mylist-poster-img" src="${POSTER_BASE}${poster_path}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="mylist-poster-placeholder">🎬</div>`;

  const watchedBadge = watched ? `<div class="mylist-watched-badge">WATCHED</div>` : "";
  const toggleLabel  = watched ? "Unwatch"  : "Watched";
  const toggleCls    = watched ? "btn-ghost" : "btn-success";

  return `
<div class="mylist-card${watched ? " watched" : ""}" id="ml-${tmdb_id}-${media_type}">
  <div class="mylist-poster-wrap">
    ${img}
    ${watchedBadge}
  </div>
  <div class="mylist-hover-card">
    <div class="mylist-hover-title">${escHtml(title)}</div>
    <div class="mylist-hover-meta">
      <span class="type-badge">${media_type === "movie" ? "Movie" : "TV"}</span>
      ${year  ? `<span>${year}</span>` : ""}
      ${score !== "–" ? `<span class="score-badge">⭐ ${score}</span>` : ""}
    </div>
    <div class="mylist-hover-actions">
      <button class="btn btn-sm btn-red" onclick="playTrailer(${tmdb_id},'${media_type}')">▶ Trailer</button>
      <button class="btn btn-sm ${toggleCls}" id="tog-${tmdb_id}-${media_type}"
        onclick="toggleWatched(${tmdb_id},'${media_type}',this)">${toggleLabel}</button>
      <button class="btn btn-sm btn-danger" onclick="removeItem(${tmdb_id},'${media_type}')">✕</button>
    </div>
  </div>
</div>`;
}

async function playTrailer(tmdbId, mediaType) {
  try {
    const data = await fetch(`/api/detail/${mediaType}/${tmdbId}`).then((r) => r.json());
    if (data.trailer?.key) {
      openTrailer(data.trailer.key);
    } else {
      showToast("No trailer found", "info");
    }
  } catch {
    showToast("Failed to load trailer", "error");
  }
}

async function toggleWatched(tmdbId, mediaType, btn) {
  btn.disabled = true;
  const data   = await apiPost("/api/watchlist/toggle", { tmdb_id: tmdbId, media_type: mediaType });
  btn.disabled = false;
  if (!data.success) { showToast("Failed to update", "error"); return; }

  const card      = document.getElementById(`ml-${tmdbId}-${mediaType}`);
  const isWatched = data.watched;

  btn.textContent = isWatched ? "Unwatch"  : "Watched";
  btn.className   = `btn btn-sm ${isWatched ? "btn-ghost" : "btn-success"}`;

  card.classList.toggle("watched", isWatched);

  const wrap  = card.querySelector(".mylist-poster-wrap");
  let   badge = wrap.querySelector(".mylist-watched-badge");
  if (isWatched && !badge) {
    badge = document.createElement("div");
    badge.className   = "mylist-watched-badge";
    badge.textContent = "WATCHED";
    wrap.appendChild(badge);
  } else if (!isWatched && badge) {
    badge.remove();
  }

  showToast(isWatched ? "Marked as watched" : "Marked as unwatched", "success");

  if (activeFilter === "watched"   && !isWatched) card.remove();
  if (activeFilter === "unwatched" &&  isWatched) card.remove();
}

async function removeItem(tmdbId, mediaType) {
  if (!confirm("Remove from My List?")) return;
  const data = await apiPost("/api/watchlist/remove", { tmdb_id: tmdbId, media_type: mediaType });
  if (data.success) {
    const card = document.getElementById(`ml-${tmdbId}-${mediaType}`);
    if (card) {
      card.style.transition = "opacity .3s, transform .3s";
      card.style.opacity    = "0";
      card.style.transform  = "scale(.9)";
      card.addEventListener("transitionend", () => {
        card.remove();
        if (!gridEl.querySelector(".mylist-card")) loadList(activeFilter);
      });
    }
    showToast("Removed from My List", "info");
  } else {
    showToast("Failed to remove", "error");
  }
}

function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="mylist-card">
      <div class="mylist-poster-wrap skeleton" style="aspect-ratio:2/3;width:100%"></div>
    </div>`).join("");
}

// Filter tabs
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadList(btn.dataset.filter);
  });
});

loadList("all");
