/**
 * theaters.js — "In Theaters" page.
 *
 * Now Showing  — static platform cards, no API calls.
 * Coming Soon  — TMDB /upcoming, paginated, server-side lang filter,
 *                dynamic language pills built from the initial "All" fetch.
 */

const LANG_NAMES = {
  en: "English", hi: "Hindi",  te: "Telugu",  ta: "Tamil",   ml: "Malayalam",
  ko: "Korean",  ja: "Japanese", es: "Spanish", fr: "French",  de: "German",
  ar: "Arabic",  tr: "Turkish",  th: "Thai",    vi: "Vietnamese", pt: "Portuguese",
  it: "Italian", zh: "Chinese",  ru: "Russian", pl: "Polish",
};

let currentTab  = "now";
let currentLang = "";
let currentPage = 1;
let totalPages  = 1;
let allMovies   = [];
let isLoading   = false;

// ── Tab switching ────────────────────────────────────────────────────────────

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab  = tab;
  currentLang = "";
  currentPage = 1;
  allMovies   = [];

  document.getElementById("tab-now").classList.toggle("active", tab === "now");
  document.getElementById("tab-coming").classList.toggle("active", tab === "coming");
  document.getElementById("now-showing-content").style.display  = tab === "now"    ? "block" : "none";
  document.getElementById("coming-soon-content").style.display  = tab === "coming" ? "block" : "none";

  if (tab === "coming") loadMovies();
}

// ── Language filter (Coming Soon only) ──────────────────────────────────────

function selectLang(el, lang) {
  document.querySelectorAll(".theaters-lang-pill").forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
  if (lang === currentLang) return;
  currentLang = lang;
  currentPage = 1;
  allMovies   = [];
  loadMovies();
}

function buildLangPills(movies) {
  const bar   = document.getElementById("lang-bar");
  const seen  = new Set();
  const codes = [];
  for (const m of movies) {
    const c = m.original_language;
    if (c && !seen.has(c)) { seen.add(c); codes.push(c); }
  }
  codes.sort((a, b) => {
    if (a === "en") return -1;
    if (b === "en") return  1;
    return (LANG_NAMES[a] || a).localeCompare(LANG_NAMES[b] || b);
  });
  let html = `<button class="theaters-lang-pill active" data-lang="" onclick="selectLang(this,'')">All</button>`;
  for (const code of codes) {
    const name = LANG_NAMES[code] || code.toUpperCase();
    html += `<button class="theaters-lang-pill" data-lang="${code}" onclick="selectLang(this,'${code}')">${escHtml(name)}</button>`;
  }
  bar.innerHTML = html;
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
      if (!currentLang) buildLangPills(allMovies);
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
