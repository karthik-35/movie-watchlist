/**
 * theaters.js — "In Theaters" page: Now Showing + Coming Soon tabs.
 */

let currentTab  = "now";
let currentLang = "";
let currentPage = 1;
let totalPages  = 1;
let allMovies   = [];
let isLoading   = false;

// ── City selector ────────────────────────────────────────────────────────────

const cityInput = document.getElementById("city-input");
cityInput.value = localStorage.getItem("theater_city") || "";
cityInput.addEventListener("change", () => {
  localStorage.setItem("theater_city", cityInput.value.trim());
});
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    cityInput.blur();
    localStorage.setItem("theater_city", cityInput.value.trim());
  }
});

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab  = tab;
  currentPage = 1;
  allMovies   = [];
  document.getElementById("tab-now").classList.toggle("active", tab === "now");
  document.getElementById("tab-coming").classList.toggle("active", tab === "coming");
  loadMovies();
}

// ── Language filter ──────────────────────────────────────────────────────────

function selectLang(el, lang) {
  document.querySelectorAll(".theaters-lang-pill").forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
  if (lang === currentLang) return;
  currentLang = lang;
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

// ── Fetch & render ───────────────────────────────────────────────────────────

async function loadMovies(append = false) {
  if (isLoading) return;
  isLoading = true;

  document.getElementById("theaters-loading").style.display = "flex";
  document.getElementById("theaters-empty").style.display   = "none";
  document.getElementById("theaters-load-more").style.display = "none";

  const endpoint = currentTab === "now"
    ? "/api/theaters/now_playing"
    : "/api/theaters/upcoming";
  let url = `${endpoint}?page=${currentPage}`;
  if (currentLang) url += `&lang=${currentLang}`;

  try {
    const data    = await fetch(url).then((r) => r.json());
    const movies  = data.results || [];
    totalPages    = data.total_pages || 1;

    if (append) {
      allMovies = [...allMovies, ...movies];
    } else {
      allMovies = movies;
    }

    renderGrid();

    if (currentPage < totalPages) {
      document.getElementById("theaters-load-more").style.display = "block";
    }
    if (allMovies.length === 0) {
      document.getElementById("theaters-empty").style.display = "block";
    }
  } catch {
    showToast("Failed to load movies", "error");
  }

  document.getElementById("theaters-loading").style.display = "none";
  isLoading = false;
}

function renderGrid() {
  const grid = document.getElementById("theaters-grid");
  grid.innerHTML = allMovies.map(renderTheatersCard).join("");
}

// ── Card renderer ────────────────────────────────────────────────────────────

function formatRelDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function renderTheatersCard(movie) {
  const id          = movie.id;
  const title       = movie.title || "";
  const releaseDate = movie.release_date || "";
  const posterSrc   = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "";

  const img = posterSrc
    ? `<img class="theaters-card-img" src="${posterSrc}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="theaters-card-placeholder">🎬</div>`;

  const dateBadge = releaseDate
    ? `<div class="theaters-date-badge">${formatRelDate(releaseDate)}</div>`
    : "";

  return `
<div class="theaters-card" onclick="location.href='/title/movie/${id}'">
  <div class="theaters-card-img-wrap">
    ${img}
    ${dateBadge}
  </div>
  <div class="theaters-card-body">
    <span class="theaters-card-title">${escHtml(title)}</span>
  </div>
</div>`;
}

// ── Init ─────────────────────────────────────────────────────────────────────

loadMovies();
