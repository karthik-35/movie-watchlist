/**
 * browse.js — Movies, TV Shows, Popular, and Language browse pages.
 */

const _browseRoot = document.getElementById("browse-root");
const category    = _browseRoot ? _browseRoot.dataset.category : "";
const rowsEl      = document.getElementById("browse-rows");

// ── Genre bar state ────────────────────────────────────────────────────────────
let _activeGenre = null; // { params: { genre, lang, ... } } | null

const MOVIE_GENRES = [
  { label: "Action",       params: { genre: "28" } },
  { label: "Adventure",    params: { genre: "12" } },
  { label: "Animation",    params: { genre: "16" } },
  { label: "Anime",        params: { genre: "16", lang: "ja" } },
  { label: "Comedy",       params: { genre: "35" } },
  { label: "Crime",        params: { genre: "80" } },
  { label: "Documentary",  params: { genre: "99" } },
  { label: "Drama",        params: { genre: "18" } },
  { label: "Family",       params: { genre: "10751" } },
  { label: "Fantasy",      params: { genre: "14" } },
  { label: "Horror",       params: { genre: "27" } },
  { label: "International",params: { exclude_lang: "en" } },
  { label: "Mystery",      params: { genre: "9648" } },
  { label: "Romance",      params: { genre: "10749" } },
  { label: "Sci-Fi",       params: { genre: "878" } },
  { label: "Thriller",     params: { genre: "53" } },
];

const TV_GENRES = [
  { label: "Action & Adventure", params: { genre: "10759" } },
  { label: "Anime",              params: { genre: "16", lang: "ja" } },
  { label: "British",            params: { origin_country: "GB" } },
  { label: "Classic & Cult",     params: { year_max: "2000" } },
  { label: "Comedy",             params: { genre: "35" } },
  { label: "Crime",              params: { genre: "80" } },
  { label: "Documentary",        params: { genre: "99" } },
  { label: "Drama",              params: { genre: "18" } },
  { label: "Horror",             params: { genre: "27" } },
  { label: "International",      params: { exclude_lang: "en" } },
  { label: "K-Dramas",           params: { lang: "ko" } },
  { label: "Kids",               params: { genre: "10762" } },
  { label: "Mysteries",          params: { genre: "9648" } },
  { label: "Reality",            params: { genre: "10764" } },
  { label: "Romance",            params: { genre: "10749" } },
  { label: "Sci-Fi & Fantasy",   params: { genre: "10765" } },
  { label: "Thriller",           params: { genre: "53" } },
];

function _monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}

// ── Row definitions ────────────────────────────────────────────────────────────

const CATEGORY_ROWS = {
  movies: [
    { title: "Top 10 Movies in the U.S. Today",         url: "/api/trending?type=movie", top10: true },
    { title: "Blockbuster Movies",                       url: "/api/discover?type=movie&vote_cnt=10000" },
    { title: "Action Thrillers",                         url: "/api/discover?genre=28,53&type=movie" },
    { title: "International Movies",                     url: "/api/discover?type=movie&exclude_lang=en" },
    { title: "Telugu Movies",                            url: "/api/discover?lang=te&type=movie" },
    { title: "Malayalam Movies",                         url: "/api/discover?lang=ml&type=movie" },
    { title: "Tamil Movies",                             url: "/api/discover?lang=ta&type=movie" },
    { title: "Award-Winning Movies",                     url: "/api/discover?type=movie&sort=vote_average.desc&vote_min=8.0&vote_cnt=500" },
    { title: "Family Movies",                            url: "/api/discover?genre=10751&type=movie" },
    { title: "Suspenseful Movies",                       url: "/api/discover?genre=53&type=movie" },
    { title: "Horror Movies",                            url: "/api/discover?genre=27&type=movie" },
    { title: "Romantic Movies",                          url: "/api/discover?genre=10749&type=movie" },
    { title: "Comedy Movies",                            url: "/api/discover?genre=35&type=movie" },
    { title: "Classic Movies",                           url: "/api/discover?type=movie&sort=vote_average.desc&vote_min=7.5&year_max=2000" },
    { title: "New Releases",                             url: `/api/discover?type=movie&sort=release_date.desc&date_from=${_monthsAgo(3)}` },
    { title: "New on Netflix",                           url: "/api/discover?type=movie&provider=8" },
    { title: "New on Prime Video",                       url: "/api/discover?type=movie&provider=9" },
    { title: "New on Zee5",                              url: "/api/discover?type=movie&provider=232" },
  ],
  tv: [
    { title: "Top 10 Shows in the U.S. Today",          url: "/api/trending?type=tv", top10: true },
    { title: "Gems for You",                             url: "/api/discover?type=tv&sort=vote_average.desc&vote_min=8.5&vote_cnt=200" },
    { title: "K-Dramas",                                 url: "/api/discover?lang=ko&type=tv" },
    { title: "Anime",                                    url: "/api/discover?genre=16&lang=ja&type=tv" },
    { title: "Teen TV Shows",                            url: "/api/discover?genre=10762&type=tv&sort=vote_average.desc&vote_cnt=50" },
    { title: "TV Comedies",                              url: "/api/discover?genre=35&type=tv" },
    { title: "Bingeworthy TV Shows",                     url: "/api/top-rated/tv" },
    { title: "Bingeworthy TV Dramas",                    url: "/api/discover?genre=18&type=tv&vote_min=8.0&vote_cnt=100" },
    { title: "Crowd Pleasers",                           url: "/api/discover?type=tv&vote_cnt=5000" },
    { title: "Exciting TV Shows",                        url: "/api/discover?genre=10759&type=tv" },
    { title: "Limited Series",                           url: "/api/discover?type=tv&series_type=2" },
    { title: "Familiar Favourite Series",                url: "/api/discover?type=tv&vote_cnt=1000" },
  ],
  popular: [
    { title: "Trending This Week",                       url: "/api/trending" },
    { title: "Popular Movies",                           url: "/api/popular/movie" },
    { title: "Popular TV Shows",                         url: "/api/popular/tv" },
    { title: "Top Rated Movies",                         url: "/api/top-rated/movie" },
    { title: "Top Rated TV Shows",                       url: "/api/top-rated/tv" },
  ],
};

function getLangRows(lang) {
  const name = ({
    hi:"Hindi", ko:"Korean", es:"Spanish", ja:"Japanese", fr:"French",
    it:"Italian", de:"German", ta:"Tamil", zh:"Mandarin", te:"Telugu",
    ml:"Malayalam", ar:"Arabic", da:"Danish", nl:"Dutch", tl:"Filipino",
    he:"Hebrew", id:"Indonesian", ms:"Malay", no:"Norwegian", pl:"Polish",
    pt:"Portuguese", sv:"Swedish", th:"Thai", tr:"Turkish", vi:"Vietnamese",
    en:"English",
  })[lang] || lang.toUpperCase();

  const sixMonAgo = _monthsAgo(6);
  return [
    { title: `Popular ${name} Movies`,         url: `/api/discover?lang=${lang}&type=movie` },
    { title: `Popular ${name} TV Shows`,        url: `/api/discover?lang=${lang}&type=tv` },
    { title: `Top Rated ${name} Movies`,        url: `/api/discover?lang=${lang}&type=movie&sort=vote_average.desc&vote_cnt=50` },
    { title: `Top Rated ${name} TV Shows`,      url: `/api/discover?lang=${lang}&type=tv&sort=vote_average.desc&vote_cnt=30` },
    { title: `New ${name} Releases`,            url: `/api/discover?lang=${lang}&type=movie&sort=release_date.desc&date_from=${sixMonAgo}` },
    { title: `${name} Action`,                  url: `/api/discover?lang=${lang}&type=movie&genre=28` },
    { title: `${name} Drama`,                   url: `/api/discover?lang=${lang}&type=tv&genre=18` },
    { title: `${name} Comedy`,                  url: `/api/discover?lang=${lang}&type=movie&genre=35` },
  ];
}

// ── Row HTML builders ──────────────────────────────────────────────────────────

function makeRowSection(rowTitle, rowId, isTop10 = false) {
  const cls = isTop10 ? "row-section top10-row" : "row-section";
  return `
<div class="${cls}" id="section-${rowId}">
  <h2 class="row-title">${escHtml(rowTitle)}</h2>
  <div class="row-wrap">
    <button class="row-arrow row-arrow-left"  onclick="scrollRow('${rowId}', -1)">&#8249;</button>
    <div class="row-cards" id="${rowId}"></div>
    <button class="row-arrow row-arrow-right" onclick="scrollRow('${rowId}', 1)">&#8250;</button>
  </div>
</div>`;
}

// ── Genre bar ──────────────────────────────────────────────────────────────────

let _genrePanelOpen = false;

function buildGenreBar(genres) {
  const barEl = document.getElementById("browse-genre-bar");
  if (!barEl) return;

  barEl.innerHTML = `
    <div class="genre-btn-wrap">
      <button class="genre-btn" id="genre-toggle-btn" onclick="toggleGenrePanel()">
        Genres <span class="dropdown-arrow">▾</span>
      </button>
      <div class="genre-panel" id="genre-panel">
        ${genres.map((g) => `
          <button class="genre-tag" data-label="${escHtml(g.label)}"
            onclick="selectGenre(${JSON.stringify(g.params)}, '${escHtml(g.label)}', this)">
            ${escHtml(g.label)}
          </button>`).join("")}
      </div>
    </div>
    <button class="genre-btn" id="genre-clear-btn" style="display:none" onclick="clearGenre()">
      ✕ Clear
    </button>`;

  document.addEventListener("click", (e) => {
    const panel = document.getElementById("genre-panel");
    const btn   = document.getElementById("genre-toggle-btn");
    if (panel && !panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
      closeGenrePanel();
    }
  });
}

function toggleGenrePanel() {
  const panel = document.getElementById("genre-panel");
  if (!panel) return;
  _genrePanelOpen = !_genrePanelOpen;
  panel.classList.toggle("open", _genrePanelOpen);
  document.getElementById("genre-toggle-btn")?.classList.toggle("active", _genrePanelOpen);
}

function closeGenrePanel() {
  _genrePanelOpen = false;
  document.getElementById("genre-panel")?.classList.remove("open");
  document.getElementById("genre-toggle-btn")?.classList.remove("active");
}

function selectGenre(params, label, el) {
  _activeGenre = { params, label };
  closeGenrePanel();

  // Update tag UI
  document.querySelectorAll(".genre-tag").forEach((t) => t.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("genre-toggle-btn").textContent = `${label} ▾`;
  document.getElementById("genre-toggle-btn").classList.add("active");

  const clearBtn = document.getElementById("genre-clear-btn");
  if (clearBtn) clearBtn.style.display = "inline-flex";

  rebuildRows();
}

function clearGenre() {
  _activeGenre = null;
  document.querySelectorAll(".genre-tag").forEach((t) => t.classList.remove("active"));
  const toggleBtn = document.getElementById("genre-toggle-btn");
  if (toggleBtn) { toggleBtn.textContent = "Genres ▾"; toggleBtn.classList.remove("active"); }
  const clearBtn = document.getElementById("genre-clear-btn");
  if (clearBtn) clearBtn.style.display = "none";
  rebuildRows();
}

/** Merge genre params into an API URL string. */
function applyGenreToUrl(baseUrl) {
  if (!_activeGenre) return baseUrl;
  const url = new URL(baseUrl, window.location.origin);
  const p   = _activeGenre.params;
  if (p.genre)          url.searchParams.set("genre", p.genre);
  if (p.lang)           url.searchParams.set("lang",  p.lang);
  if (p.exclude_lang)   url.searchParams.set("exclude_lang", p.exclude_lang);
  if (p.origin_country) url.searchParams.set("origin_country", p.origin_country);
  if (p.year_max)       url.searchParams.set("year_max", p.year_max);
  return url.pathname + url.search;
}

// ── Fetch row data ─────────────────────────────────────────────────────────────

async function fetchBrowseRow(containerId, apiUrl, isTop10 = false) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = Array.from({ length: 8 }, () =>
    `<div class="${isTop10 ? "top10-item" : "row-card"} skeleton" style="aspect-ratio:${isTop10 ? "2/3" : "16/9"};flex:0 0 ${isTop10 ? "130px" : "185px"}"></div>`
  ).join("");

  try {
    const finalUrl = applyGenreToUrl(apiUrl);
    const data  = await fetch(finalUrl).then((r) => r.json());
    const items = (data.results || []).filter((r) => isTop10 ? r.poster_path : (r.backdrop_path || r.poster_path));
    if (!items.length) {
      el.closest(".row-section")?.remove();
      return;
    }

    if (isTop10) {
      const top = items.slice(0, 10);
      el.innerHTML = top.map((item, i) => renderTop10Card(item, i + 1)).join("");
    } else {
      initInfiniteRow(containerId, items, renderRowCard);
    }
  } catch {
    el.closest(".row-section")?.remove();
  }
}

// ── Hero banner (non-language pages) ──────────────────────────────────────────

async function loadBrowseHero(rows) {
  const heroEl  = document.getElementById("browse-hero");
  const bgEl    = document.getElementById("browse-hero-bg");
  const contEl  = document.getElementById("browse-hero-content");
  if (!heroEl || !bgEl || !contEl) return;

  // Pick first non-top10 row to pull hero from
  const sourceRow = rows.find((r) => !r.top10);
  if (!sourceRow) return;

  try {
    const data  = await fetch(sourceRow.url).then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path);
    if (!items.length) return;

    const item  = items[Math.floor(Math.random() * Math.min(5, items.length))];
    const title = item.title || item.name || "";
    const year  = (item.release_date || item.first_air_date || "").slice(0, 4);
    const type  = item.media_type;
    const desc  = (item.overview || "").slice(0, 180) + ((item.overview || "").length > 180 ? "…" : "");
    const score = item.vote_average ? item.vote_average.toFixed(1) : "";

    bgEl.style.backgroundImage = `url(https://image.tmdb.org/t/p/original${item.backdrop_path})`;
    heroEl.style.display = "block";

    contEl.innerHTML = `
      <div class="hero-type-badge">${type === "movie" ? "🎬 Movie" : "📺 TV Show"}</div>
      <h2 class="hero-title">${escHtml(title)}</h2>
      <div class="hero-meta">
        ${score ? `<span>⭐ ${score}</span><span>·</span>` : ""}
        ${year  ? `<span>${year}</span>` : ""}
      </div>
      <p class="hero-desc">${escHtml(desc)}</p>
      <div class="hero-actions">
        <a href="/title/${type}/${item.id}" class="btn btn-white">ℹ More Info</a>
        <button class="btn btn-outline-white"
          onclick="heroAddToList(${item.id},'${type}',${JSON.stringify(title)},${JSON.stringify(item.poster_path||'')},${JSON.stringify(desc)},${JSON.stringify(item.release_date||item.first_air_date||'')},${item.vote_average||0})">
          + My List
        </button>
      </div>`;
  } catch { /* non-fatal */ }
}

async function heroAddToList(tmdbId, mediaType, title, posterPath, overview, releaseDate, voteAverage) {
  const data = await apiPost("/api/watchlist/add", {
    tmdb_id: tmdbId, media_type: mediaType, title,
    poster_path: posterPath, overview, release_date: releaseDate, vote_average: voteAverage,
  });
  showToast(data.success ? data.message : (data.error || "Error"), data.success ? "success" : "error");
}

// ── Main loader ────────────────────────────────────────────────────────────────

function rebuildRows() {
  if (!rowsEl) return;
  const rows = _currentRows;
  rowsEl.innerHTML = rows.map((r, i) => makeRowSection(r.title, `browse-row-${i}`, r.top10)).join("");
  rows.forEach((r, i) => fetchBrowseRow(`browse-row-${i}`, r.url, r.top10));
}

let _currentRows = [];

async function loadBrowse() {
  if (!rowsEl) return;

  let rows = CATEGORY_ROWS[category];
  const isLang = category.startsWith("lang-");

  if (!rows && isLang) {
    rows = getLangRows(category.replace("lang-", ""));
  }
  if (!rows) {
    rowsEl.innerHTML = `<p style="padding:2rem 4%;color:var(--text-muted)">Unknown category.</p>`;
    return;
  }

  _currentRows = rows;

  // Genre bar (only for movies / tv)
  if (category === "movies") buildGenreBar(MOVIE_GENRES);
  else if (category === "tv") buildGenreBar(TV_GENRES);

  // Hero (non-language pages)
  if (!isLang) loadBrowseHero(rows);

  // Build row shells
  rowsEl.innerHTML = rows.map((r, i) => makeRowSection(r.title, `browse-row-${i}`, r.top10)).join("");

  // Fetch all rows in parallel
  await Promise.all(rows.map((r, i) => fetchBrowseRow(`browse-row-${i}`, r.url, r.top10)));
}

loadBrowse();
