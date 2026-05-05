/**
 * theaters.js — "In Theaters" page.
 *
 * Now Showing  — static platform cards, no API calls.
 * Coming Soon  — TMDB /upcoming, paginated, server-side lang filter,
 *                dynamic language pills built from the initial "All" fetch.
 */

const GENRE_NAMES = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Sci-Fi",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};


let currentTab  = "now";
let currentLang = "en";
let currentPage = 1;
let totalPages  = 1;
let allMovies   = [];
let isLoading   = false;

function toSlug(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ── Hot movies (Now Showing) ─────────────────────────────────────────────────

async function loadHotMovies() {
  const track   = document.getElementById("hot-track");
  const loading = document.getElementById("hot-loading");
  if (!track) return;

  loading.style.display = "flex";

  try {
    const data   = await fetch("/api/theaters/hot").then((r) => r.json());
    const movies = data.results || [];
    track.innerHTML = movies.map(renderHotCard).join("");
  } catch {
    track.innerHTML = `<p style="color:var(--text-muted);padding:1rem">Failed to load hot movies.</p>`;
  }

  loading.style.display = "none";
}

function formatVotes(count) {
  if (!count) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M+ Votes`;
  if (count >= 1_000)     return `${(count / 1_000).toFixed(1)}K+ Votes`;
  return `${count} Votes`;
}

function getGenreNames(ids = []) {
  return ids.slice(0, 3).map((id) => GENRE_NAMES[id]).filter(Boolean);
}

function renderMovieCard(movie, { showDate = false } = {}) {
  const id         = movie.id;
  const title      = movie.title || "";
  const relDate    = movie.release_date || "";
  const posterSrc  = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "";
  const rating     = movie.vote_average ? movie.vote_average.toFixed(1) : "";
  const voteCount  = formatVotes(movie.vote_count);
  const genreNames = getGenreNames(movie.genre_ids || []);

  const img = posterSrc
    ? `<img class="theaters-card-img" src="${escHtml(posterSrc)}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="theaters-card-placeholder">🎬</div>`;

  const dateLine = showDate && relDate
    ? `<div class="theaters-card-date-line">${escHtml(formatRelDate(relDate))}</div>`
    : "";

  const ratingRow = rating
    ? `<div class="theaters-card-rating-row">
        <span class="theaters-card-rating-score">⭐ ${escHtml(rating)}/10</span>
       </div>`
    : "";

  const infoBar = (dateLine || ratingRow)
    ? `<div class="theaters-card-info-bar">${dateLine}${ratingRow}</div>`
    : "";

  const genresHtml = genreNames.length
    ? `<div class="theaters-card-genres">${genreNames.map((g) => `<span class="theaters-card-genre-tag">${escHtml(g)}</span>`).join("")}</div>`
    : "";

  return `
<div class="theaters-card" onclick="location.href='/title/movie/${id}'">
  <div class="theaters-card-img-wrap">
    ${img}
    ${infoBar}
  </div>
  <div class="theaters-card-body">
    <span class="theaters-card-title">${escHtml(title)}</span>
    ${genresHtml}
  </div>
</div>`;
}

function renderHotCard(movie) {
  return renderMovieCard(movie, { showDate: false });
}

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab  = tab;
  currentPage = 1;
  allMovies   = [];

  document.getElementById("tab-now").classList.toggle("active", tab === "now");
  document.getElementById("tab-coming").classList.toggle("active", tab === "coming");
  document.getElementById("now-showing-content").style.display = tab === "now"    ? "block" : "none";
  document.getElementById("coming-soon-content").style.display = tab === "coming" ? "block" : "none";

  if (tab === "coming") {
    currentLang = "en";
    const sel = document.getElementById("cs-lang-select");
    if (sel) sel.value = "en";
    loadMovies();
  }
}

// ── Language filter (Coming Soon) ────────────────────────────────────────────

function onLangChange(val) {
  if (val === currentLang) return;
  currentLang = val;
  currentPage = 1;
  allMovies   = [];
  loadMovies();
}

// ── Load more ────────────────────────────────────────────────────────────────

function loadMore() {
  if (isLoading || currentPage >= totalPages) return;
  currentPage++;
  loadMovies(true);
}

// ── Fetch & render (Coming Soon) ─────────────────────────────────────────────

async function loadMovies(append = false) {
  if (isLoading) return;
  isLoading = true;

  document.getElementById("theaters-loading").style.display    = "flex";
  document.getElementById("theaters-empty").style.display      = "none";
  document.getElementById("theaters-load-more").style.display  = "none";

  let url = `/api/theaters/upcoming?page=${currentPage}`;
  if (currentLang) url += `&lang=${currentLang}`;

  try {
    const data   = await fetch(url).then((r) => r.json());
    const movies = data.results || [];
    totalPages   = data.total_pages || 1;

    if (append) {
      allMovies = [...allMovies, ...movies];
    } else {
      allMovies = movies;
    }

    document.getElementById("theaters-grid").innerHTML = allMovies.map(renderComingSoonCard).join("");

    if (currentPage < totalPages) document.getElementById("theaters-load-more").style.display = "block";
    if (allMovies.length === 0)   document.getElementById("theaters-empty").style.display    = "block";
  } catch {
    showToast("Failed to load movies", "error");
  }

  document.getElementById("theaters-loading").style.display = "none";
  isLoading = false;
}

// ── Card renderer (Coming Soon) ──────────────────────────────────────────────

function formatRelDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function renderComingSoonCard(movie) {
  return renderMovieCard(movie, { showDate: true });
}

// ── Init ─────────────────────────────────────────────────────────────────────

loadHotMovies();
