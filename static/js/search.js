/**
 * search.js — search page: debounced query, poster card results, pagination.
 * Also reads hash for pre-filled query from navbar search.
 */

let currentPage  = 1;
let currentQuery = "";
let debounceTimer;
let watchlistSet = new Set();

const inputEl    = document.getElementById("search-input");
const statusEl   = document.getElementById("search-status");
const resultsEl  = document.getElementById("search-results");
const paginEl    = document.getElementById("pagination");

async function initWatchlistSet() {
  try {
    const data  = await fetch("/api/watchlist").then((r) => r.json());
    watchlistSet = new Set((data.items || []).map((i) => `${i.tmdb_id}-${i.media_type}`));
  } catch { watchlistSet = new Set(); }
}

// Pre-fill from navbar search (#query)
if (location.hash) {
  const q = decodeURIComponent(location.hash.slice(1));
  if (q && inputEl) { inputEl.value = q; currentQuery = q; }
}

inputEl.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = inputEl.value.trim();
  if (!q) {
    resultsEl.innerHTML = "";
    paginEl.innerHTML   = "";
    statusEl.textContent = "";
    return;
  }
  debounceTimer = setTimeout(() => { currentPage = 1; currentQuery = q; doSearch(); }, 380);
});

async function doSearch() {
  if (!currentQuery) return;
  statusEl.textContent = "Searching…";
  resultsEl.innerHTML  = skeletons(12);

  try {
    const data = await fetch(
      `/api/search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}`
    ).then((r) => r.json());

    if (data.error) { statusEl.textContent = data.error; resultsEl.innerHTML = ""; return; }

    const results = data.results || [];
    statusEl.textContent = results.length
      ? `${data.total_results.toLocaleString()} results for "${currentQuery}"`
      : `No results for "${currentQuery}"`;

    resultsEl.innerHTML = results.map((r) =>
      renderPosterCard(r, watchlistSet.has(`${r.id}-${r.media_type}`))
    ).join("");

    // Lazy-load providers for each card
    results.forEach((r) => loadCardProviders(r.id, r.media_type, `pc-prov-${r.id}-${r.media_type}`));

    renderPagination(currentPage, Math.min(data.total_pages, 20));
  } catch {
    statusEl.textContent = "Something went wrong. Please try again.";
    resultsEl.innerHTML  = "";
  }
}

function renderPagination(current, total) {
  if (total <= 1) { paginEl.innerHTML = ""; return; }
  const pages = [];
  for (let i = Math.max(1, current - 3); i <= Math.min(total, current + 3); i++) pages.push(i);
  paginEl.innerHTML =
    `<button class="page-btn" ${current===1?"disabled":""} onclick="goPage(${current-1})">‹</button>` +
    pages.map((p) => `<button class="page-btn ${p===current?"active":""}" onclick="goPage(${p})">${p}</button>`).join("") +
    `<button class="page-btn" ${current===total?"disabled":""} onclick="goPage(${current+1})">›</button>`;
}

function goPage(p) {
  currentPage = p;
  doSearch();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="poster-card">
      <div class="skeleton" style="aspect-ratio:2/3;width:100%"></div>
      <div class="poster-card-body" style="gap:.5rem">
        <div class="skeleton" style="height:12px;width:80%"></div>
        <div class="skeleton" style="height:10px;width:50%"></div>
      </div>
    </div>`).join("");
}

// Init
initWatchlistSet().then(() => { if (currentQuery) doSearch(); });
