/**
 * search.js — handles the search page: debounced query, results rendering,
 * provider logos, add-to-watchlist, and pagination.
 */

let currentPage  = 1;
let currentQuery = "";
let debounceTimer;

const input      = document.getElementById("search-input");
const statusEl   = document.getElementById("search-status");
const resultsEl  = document.getElementById("search-results");
const paginationEl = document.getElementById("pagination");

// Track which titles are already in the watchlist to show correct button state
let watchlistIds = new Set();

async function fetchWatchlistIds() {
  try {
    const data = await fetch("/api/watchlist").then((r) => r.json());
    watchlistIds = new Set(
      (data.items || []).map((i) => `${i.tmdb_id}-${i.media_type}`)
    );
  } catch {
    watchlistIds = new Set();
  }
}

/** Debounce search so we don't hammer TMDB on every keystroke. */
input.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (!q) {
    resultsEl.innerHTML = "";
    paginationEl.innerHTML = "";
    statusEl.textContent = "";
    return;
  }
  debounceTimer = setTimeout(() => {
    currentPage  = 1;
    currentQuery = q;
    runSearch(q, 1);
  }, 400);
});

async function runSearch(query, page) {
  statusEl.textContent = "Searching…";
  resultsEl.innerHTML  = renderSkeletons(8);

  try {
    const data = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&page=${page}`
    ).then((r) => r.json());

    if (data.error) { statusEl.textContent = data.error; resultsEl.innerHTML = ""; return; }

    const results = data.results || [];
    statusEl.textContent = results.length
      ? `${data.total_results.toLocaleString()} results`
      : "No results found.";

    resultsEl.innerHTML = results.map(renderSearchCard).join("");

    // Load providers lazily after cards are in DOM
    results.forEach((r) =>
      loadProviders(r.id, r.media_type, `providers-${r.id}-${r.media_type}`)
    );

    renderPagination(page, data.total_pages);
  } catch {
    statusEl.textContent = "Something went wrong. Please try again.";
    resultsEl.innerHTML  = "";
  }
}

function renderSearchCard(item) {
  const id         = item.id;
  const type       = item.media_type;
  const title      = item.title || item.name || "Unknown";
  const date       = item.release_date || item.first_air_date || "";
  const rating     = item.vote_average ? item.vote_average.toFixed(1) : "–";
  const poster     = item.poster_path
    ? `<img class="card-poster" src="${POSTER_BASE}${item.poster_path}" alt="${title}" loading="lazy">`
    : `<div class="card-poster-placeholder">🎬</div>`;
  const inList     = watchlistIds.has(`${id}-${type}`);
  const btnClass   = inList ? "btn-success" : "btn-primary";
  const btnLabel   = inList ? "✓ In Watchlist" : "+ Add to Watchlist";

  return `
<div class="card" id="card-${id}-${type}">
  ${poster}
  <div class="card-body">
    <div class="card-title">${title}</div>
    <div class="card-meta">
      <span class="badge">${type === "movie" ? "Movie" : "TV"}</span>
      <span>${releaseYear(date)}</span>
      <span class="tmdb-rating">⭐ ${rating}</span>
    </div>
    <div class="providers" id="providers-${id}-${type}">
      <span class="skeleton" style="width:28px;height:28px;border-radius:6px;display:inline-block"></span>
    </div>
    <div class="card-actions">
      <button
        class="btn ${btnClass} btn-sm"
        id="add-btn-${id}-${type}"
        onclick="addToWatchlist(${id}, '${type}', ${JSON.stringify(title)}, ${JSON.stringify(item.poster_path || "")}, ${JSON.stringify(truncate(item.overview, 300))}, ${JSON.stringify(date)}, ${item.vote_average || 0})"
        ${inList ? "disabled" : ""}
      >${btnLabel}</button>
    </div>
  </div>
</div>`;
}

async function addToWatchlist(tmdbId, mediaType, title, posterPath, overview, releaseDate, voteAverage) {
  const btn = document.getElementById(`add-btn-${tmdbId}-${mediaType}`);
  if (btn) { btn.disabled = true; btn.textContent = "Adding…"; }

  const data = await apiPost("/api/watchlist/add", {
    tmdb_id:      tmdbId,
    media_type:   mediaType,
    title,
    poster_path:  posterPath,
    overview,
    release_date: releaseDate,
    vote_average: voteAverage,
  });

  if (data.success) {
    watchlistIds.add(`${tmdbId}-${mediaType}`);
    if (btn) {
      btn.textContent = "✓ In Watchlist";
      btn.className   = "btn btn-success btn-sm";
    }
    showToast(data.message, "success");
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "+ Add to Watchlist"; }
    showToast(data.error || "Failed to add", "error");
  }
}

function renderPagination(current, total) {
  if (total <= 1) { paginationEl.innerHTML = ""; return; }

  // Show at most 7 page buttons around the current page
  const pages = [];
  const delta = 3;
  for (let i = Math.max(1, current - delta); i <= Math.min(total, current + delta); i++) {
    pages.push(i);
  }

  const prevBtn = `<button class="page-btn" ${current === 1 ? "disabled" : ""} onclick="goPage(${current - 1})">‹ Prev</button>`;
  const nextBtn = `<button class="page-btn" ${current === total ? "disabled" : ""} onclick="goPage(${current + 1})">Next ›</button>`;
  const pageBtns = pages.map(
    (p) => `<button class="page-btn ${p === current ? "active" : ""}" onclick="goPage(${p})">${p}</button>`
  ).join("");

  paginationEl.innerHTML = prevBtn + pageBtns + nextBtn;
}

function goPage(page) {
  currentPage = page;
  runSearch(currentQuery, page);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSkeletons(n) {
  return Array.from({ length: n }, () => `
<div class="card">
  <div class="skeleton" style="aspect-ratio:2/3;width:100%"></div>
  <div class="card-body" style="gap:.5rem">
    <div class="skeleton" style="height:14px;width:80%"></div>
    <div class="skeleton" style="height:12px;width:50%"></div>
  </div>
</div>`).join("");
}

// Initialise: load existing watchlist IDs so buttons show correct state
fetchWatchlistIds();
