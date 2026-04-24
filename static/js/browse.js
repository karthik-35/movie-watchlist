/**
 * browse.js — Movies, TV Shows, Popular, and Language browse pages.
 * Reads data-category attribute to decide which API rows to load.
 */

const root     = document.getElementById("browse-root");
const category = root ? root.dataset.category : "";
const rowsEl   = document.getElementById("browse-rows");

// Map category → list of { title, apiUrl }
const CATEGORY_ROWS = {
  movies: [
    { title: "Popular Movies",       url: "/api/popular/movie" },
    { title: "Top Rated Movies",     url: "/api/top-rated/movie" },
    { title: "Trending This Week",   url: "/api/trending" },
  ],
  tv: [
    { title: "Popular TV Shows",     url: "/api/popular/tv" },
    { title: "Top Rated TV Shows",   url: "/api/top-rated/tv" },
    { title: "Trending TV",          url: "/api/trending" },
  ],
  popular: [
    { title: "Trending This Week",   url: "/api/trending" },
    { title: "Popular Movies",       url: "/api/popular/movie" },
    { title: "Popular TV Shows",     url: "/api/popular/tv" },
  ],
};

// Language category: "lang-hi", "lang-ko", etc.
function getLangRows(lang) {
  const langNames = { hi:"Hindi", ko:"Korean", es:"Spanish", ja:"Japanese",
                      fr:"French", it:"Italian", de:"German", ta:"Tamil", zh:"Chinese" };
  const name = langNames[lang] || lang.toUpperCase();
  return [
    { title: `${name} Movies`,   url: `/api/discover?lang=${lang}&type=movie` },
    { title: `${name} TV Shows`, url: `/api/discover?lang=${lang}&type=tv` },
  ];
}

function makeRowSection(rowTitle, rowId) {
  return `
<div class="row-section">
  <h2 class="row-title">${escHtml(rowTitle)}</h2>
  <div class="row-wrap">
    <button class="row-arrow row-arrow-left"  onclick="scrollRow('${rowId}', -1)">&#8249;</button>
    <div class="row-cards" id="${rowId}"></div>
    <button class="row-arrow row-arrow-right" onclick="scrollRow('${rowId}', 1)">&#8250;</button>
  </div>
</div>`;
}

async function loadBrowse() {
  if (!rowsEl) return;

  let rows = CATEGORY_ROWS[category];

  if (!rows && category.startsWith("lang-")) {
    rows = getLangRows(category.replace("lang-", ""));
  }

  if (!rows) {
    rowsEl.innerHTML = `<p style="padding:2rem 4%;color:var(--text-muted)">Unknown category.</p>`;
    return;
  }

  // Build row shells
  rowsEl.innerHTML = rows.map((r, i) => makeRowSection(r.title, `browse-row-${i}`)).join("");

  // Fetch all rows in parallel
  await Promise.all(rows.map((r, i) => fetchBrowseRow(`browse-row-${i}`, r.url)));
}

async function fetchBrowseRow(containerId, apiUrl) {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Show skeletons
  el.innerHTML = Array.from({ length: 8 }, () =>
    `<div class="row-card skeleton" style="aspect-ratio:16/9;flex:0 0 185px"></div>`
  ).join("");

  try {
    const data  = await fetch(apiUrl).then((r) => r.json());
    const items = (data.results || []).filter((r) => r.backdrop_path || r.poster_path);
    el.innerHTML = items.map(renderRowCard).join("");
  } catch {
    el.innerHTML = "";
  }
}

loadBrowse();
