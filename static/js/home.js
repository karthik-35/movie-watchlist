/**
 * home.js — Home page: hero banner + 30+ randomized content rows.
 */

function _monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

// Streaming rows — inserted with ≥5 row gap between them
const STREAMING_ROWS = [
  { title: "New on Netflix",      url: "/api/discover?type=movie&provider=8" },
  { title: "New on Prime Video",  url: "/api/discover?type=movie&provider=9" },
  { title: "New on Zee5",         url: "/api/discover?type=movie&provider=232" },
];

// Regular rows — shuffled each reload
const REGULAR_ROWS = [
  { title: "Blockbuster Movies",           url: "/api/discover?type=movie&vote_cnt=10000" },
  { title: "Action Thrillers",             url: "/api/discover?genre=28,53&type=movie" },
  { title: "International Movies",         url: "/api/discover?type=movie&exclude_lang=en" },
  { title: "Telugu Movies",               url: "/api/discover?lang=te&type=movie" },
  { title: "Award-Winning Movies",         url: "/api/discover?type=movie&sort=vote_average.desc&vote_min=8.0&vote_cnt=500" },
  { title: "Popular TV Shows",             url: "/api/popular/tv" },
  { title: "Top Rated Movies",             url: "/api/top-rated/movie" },
  { title: "Top Rated TV Shows",           url: "/api/top-rated/tv" },
  { title: "Hindi Cinema",                 url: "/api/discover?lang=hi&type=movie" },
  { title: "Korean Dramas & Films",        url: "/api/discover?lang=ko&type=tv" },
  { title: "Family Movies",               url: "/api/discover?genre=10751&type=movie" },
  { title: "Horror Movies",               url: "/api/discover?genre=27&type=movie" },
  { title: "Romantic Movies",             url: "/api/discover?genre=10749&type=movie" },
  { title: "Comedy Movies",               url: "/api/discover?genre=35&type=movie" },
  { title: "Sci-Fi & Fantasy",            url: "/api/discover?genre=878,14&type=movie" },
  { title: "Anime",                        url: "/api/discover?genre=16&lang=ja&type=tv" },
  { title: "Classic Movies",              url: "/api/discover?type=movie&sort=vote_average.desc&vote_min=7.5&year_max=2000" },
  { title: "New Releases",                url: `/api/discover?type=movie&sort=release_date.desc&date_from=${_monthsAgo(3)}` },
  { title: "Spanish Cinema",              url: "/api/discover?lang=es&type=movie" },
  { title: "Tamil Movies",               url: "/api/discover?lang=ta&type=movie" },
  { title: "Malayalam Movies",            url: "/api/discover?lang=ml&type=movie" },
  { title: "Japanese Films",              url: "/api/discover?lang=ja&type=movie" },
  { title: "Crime & Thriller TV",         url: "/api/discover?genre=80,9648&type=tv" },
  { title: "Suspenseful Movies",          url: "/api/discover?genre=53&type=movie" },
  { title: "Crowd Pleasers",             url: "/api/discover?type=tv&vote_cnt=5000" },
  { title: "Documentary Films",           url: "/api/discover?genre=99&type=movie" },
  { title: "Adventurous Picks",           url: "/api/discover?genre=12&type=movie" },
];

/** Fisher-Yates shuffle (in-place, returns array). */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build final row order:
 * - Trending always first
 * - Regular rows shuffled
 * - Streaming rows inserted at evenly spaced positions, ≥5 apart
 */
function buildRowOrder() {
  const regular  = shuffle([...REGULAR_ROWS]);
  const total    = regular.length + STREAMING_ROWS.length;
  const result   = [...regular];

  // Compute insert positions with ≥5 gap between streaming rows
  const minGap = 5;
  const positions = [];
  const spread = Math.floor(result.length / (STREAMING_ROWS.length + 1));

  for (let i = 0; i < STREAMING_ROWS.length; i++) {
    let pos = spread * (i + 1) + (positions.length > 0 ? 0 : 0);
    // Ensure ≥5 gap from previous streaming row
    if (positions.length > 0) {
      pos = Math.max(pos, positions[positions.length - 1] + minGap);
    }
    pos = Math.min(pos, result.length - STREAMING_ROWS.length + i);
    positions.push(pos);
  }

  // Insert streaming rows at computed positions (offset by already-inserted count)
  positions.forEach((pos, idx) => {
    result.splice(pos + idx, 0, STREAMING_ROWS[idx]);
  });

  return result;
}

// ── Hero ──────────────────────────────────────────────────────────────────────

async function loadHero() {
  try {
    const data  = await fetch("/api/trending").then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path);
    if (!items.length) return;
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

  const title = item.title || item.name || "";
  const type  = item.media_type;
  const year  = (item.release_date || item.first_air_date || "").slice(0, 4);
  const score = item.vote_average ? item.vote_average.toFixed(1) : "";
  const desc  = (item.overview || "").slice(0, 200) + ((item.overview || "").length > 200 ? "…" : "");
  const moods = getMoodTags((item.genre_ids || []).map((id) => ({ id }))).join(" · ");

  content.innerHTML = `
    <div class="hero-type-badge">${type === "movie" ? "🎬 Movie" : "📺 TV Show"}</div>
    <h2 class="hero-title">${escHtml(title)}</h2>
    <div class="hero-meta">
      ${score ? `<span>⭐ ${score}</span><span>·</span>` : ""}
      ${year  ? `<span>${year}</span>` : ""}
      ${moods ? `<span>·</span><span>${escHtml(moods)}</span>` : ""}
    </div>
    <p class="hero-desc">${escHtml(desc)}</p>
    <div class="hero-actions">
      <button class="btn btn-red" id="hero-trailer-btn" style="display:none"
        onclick="openTrailer(window._heroTrailerKey)">▶ Play Trailer</button>
      <a href="/title/${type}/${item.id}" class="btn btn-white">ℹ More Info</a>
      <button class="btn btn-outline-white"
        onclick="heroAddToList(${item.id},'${type}',${JSON.stringify(title)},${JSON.stringify(item.poster_path||'')},${JSON.stringify(desc)},${JSON.stringify(item.release_date||item.first_air_date||'')},${item.vote_average||0})">
        + My List
      </button>
    </div>`;

  fetchHeroTrailer(item.id, type);

  if (side) {
    side.innerHTML = score ? `<div class="score-badge" style="font-size:1rem">⭐ ${score}</div>` : "";
  }
}

async function fetchHeroTrailer(tmdbId, mediaType) {
  try {
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

// ── Dynamic rows ──────────────────────────────────────────────────────────────

function _makeRowSection(title, rowId) {
  return `
<div class="row-section" id="section-${rowId}">
  <h2 class="row-title">${escHtml(title)}</h2>
  <div class="row-wrap">
    <button class="row-arrow row-arrow-left"  onclick="scrollRow('${rowId}', -1)">&#8249;</button>
    <div class="row-cards" id="${rowId}"></div>
    <button class="row-arrow row-arrow-right" onclick="scrollRow('${rowId}', 1)">&#8250;</button>
  </div>
</div>`;
}

async function _fetchRow(rowId, apiUrl) {
  const el = document.getElementById(rowId);
  if (!el) return;

  el.innerHTML = Array.from({ length: 8 }, () =>
    `<div class="row-card skeleton" style="aspect-ratio:16/9;flex:0 0 185px;border-radius:6px"></div>`
  ).join("");

  try {
    const data  = await fetch(apiUrl).then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path || r.poster_path);
    if (!items.length) {
      el.closest(".row-section")?.remove();
      return;
    }
    initInfiniteRow(rowId, items, renderRowCard);
  } catch {
    el.closest(".row-section")?.remove();
  }
}

async function loadHomeRows() {
  const container = document.getElementById("dynamic-home-rows");
  if (!container) return;

  const rows = buildRowOrder();
  container.innerHTML = rows.map((r, i) => _makeRowSection(r.title, `home-row-${i}`)).join("");
  await Promise.all(rows.map((r, i) => _fetchRow(`home-row-${i}`, r.url)));
}

// ── Trending row (static, always first) ───────────────────────────────────────

async function loadTrendingRow() {
  const containerId = "row-trending-cards";
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = Array.from({ length: 8 }, () =>
    `<div class="row-card skeleton" style="aspect-ratio:16/9;flex:0 0 185px;border-radius:6px"></div>`
  ).join("");

  try {
    const data  = await fetch("/api/trending").then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path || r.poster_path);
    if (items.length) initInfiniteRow(containerId, items, renderRowCard);
  } catch { /* non-fatal */ }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
loadHero();
loadTrendingRow();
loadHomeRows();
