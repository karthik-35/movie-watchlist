/**
 * home.js — home page: hero banner + all horizontal content rows.
 */

// Render a row of cards into a container, showing skeletons first
function showRowSkeletons(containerId, n = 8) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({ length: n }, () => `
    <div class="row-card skeleton" style="aspect-ratio:16/9;flex:0 0 185px;border-radius:6px"></div>
  `).join("");
}

async function fetchAndRenderRow(containerId, apiUrl) {
  showRowSkeletons(containerId);
  try {
    const data = await fetch(apiUrl).then((r) => r.json());
    const el   = document.getElementById(containerId);
    if (!el) return;
    const items = (data.results || []).filter((r) => r.backdrop_path || r.poster_path);
    el.innerHTML = items.map(renderRowCard).join("");
  } catch {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = "";
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────────
async function loadHero() {
  try {
    const data  = await fetch("/api/trending").then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path);
    if (!items.length) return;

    // Pick a random title from the top 5 for variety on each page load
    const item = items[Math.floor(Math.random() * Math.min(5, items.length))];
    renderHero(item);
  } catch { /* leave skeleton */ }
}

function renderHero(item) {
  const bg      = document.getElementById("hero-bg");
  const content = document.getElementById("hero-content");
  const side    = document.getElementById("hero-side");

  if (!bg || !content) return;

  bg.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;

  const title  = item.title || item.name || "";
  const type   = item.media_type;
  const year   = (item.release_date || item.first_air_date || "").slice(0, 4);
  const score  = item.vote_average ? item.vote_average.toFixed(1) : "";
  const desc   = (item.overview || "").slice(0, 200) + (item.overview?.length > 200 ? "…" : "");
  const moods  = getMoodTags((item.genre_ids || []).map((id) => ({ id }))).join(" · ");

  content.innerHTML = `
    <div class="hero-type-badge">
      ${type === "movie" ? "🎬 Movie" : "📺 TV Show"}
    </div>
    <h2 class="hero-title">${escHtml(title)}</h2>
    <div class="hero-meta">
      ${score ? `<span>⭐ ${score}</span><span>·</span>` : ""}
      ${year  ? `<span>${year}</span>` : ""}
      ${moods ? `<span>·</span><span>${escHtml(moods)}</span>` : ""}
    </div>
    <p class="hero-desc">${escHtml(desc)}</p>
    <div class="hero-actions">
      <button class="btn btn-red" id="hero-trailer-btn" style="display:none" onclick="openTrailer(window._heroTrailerKey)">
        ▶ Play Trailer
      </button>
      <a href="/title/${type}/${item.id}" class="btn btn-white">ℹ More Info</a>
      <button class="btn btn-outline-white" onclick="heroAddToList(${item.id},'${type}',${JSON.stringify(title)},${JSON.stringify(item.poster_path||'')},${JSON.stringify(desc)},${JSON.stringify(item.release_date||item.first_air_date||'')},${item.vote_average||0})">
        + My List
      </button>
    </div>`;

  // Fetch trailer in background so Play Trailer button can appear
  fetchHeroTrailer(item.id, type);

  if (side) {
    side.innerHTML = score ? `<div class="score-badge" style="font-size:1rem">⭐ ${score}</div>` : "";
  }
}

async function fetchHeroTrailer(tmdbId, mediaType) {
  try {
    // We don't have a standalone trailer endpoint, so use detail
    const data = await fetch(`/api/detail/${mediaType}/${tmdbId}`).then((r) => r.json());
    if (data.trailer?.key) {
      window._heroTrailerKey = data.trailer.key;
      const btn = document.getElementById("hero-trailer-btn");
      if (btn) btn.style.display = "inline-flex";
    }
  } catch { /* non-fatal */ }
}

async function heroAddToList(tmdbId, mediaType, title, posterPath, overview, releaseDate, voteAverage) {
  const data = await apiPost("/api/watchlist/add", {
    tmdb_id: tmdbId, media_type: mediaType, title,
    poster_path: posterPath, overview, release_date: releaseDate, vote_average: voteAverage,
  });
  showToast(data.success ? data.message : (data.error || "Error"), data.success ? "success" : "error");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadHero();

fetchAndRenderRow("row-trending-cards",  "/api/trending");
fetchAndRenderRow("row-movies-cards",    "/api/popular/movie");
fetchAndRenderRow("row-tv-cards",        "/api/popular/tv");
fetchAndRenderRow("row-toprated-cards",  "/api/top-rated/movie");
fetchAndRenderRow("row-hindi-cards",     "/api/discover?lang=hi&type=movie");
fetchAndRenderRow("row-korean-cards",    "/api/discover?lang=ko&type=tv");
