/**
 * main.js — shared utilities, constants, and card renderers used by all pages.
 */

const POSTER_BASE   = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const PROFILE_BASE  = "https://image.tmdb.org/t/p/w185";
const LOGO_BASE     = "https://image.tmdb.org/t/p/original";

// Genre ID → mood descriptors (displayed as dot-separated tags)
const GENRE_MOODS = {
  28:    ["Action-Packed", "Exciting", "Thrilling"],
  12:    ["Adventurous", "Epic", "Exhilarating"],
  16:    ["Fun", "Colorful", "Imaginative"],
  35:    ["Feel-good", "Funny", "Light-hearted"],
  80:    ["Gritty", "Suspenseful", "Dark"],
  99:    ["Insightful", "Real", "Eye-opening"],
  18:    ["Emotional", "Moving", "Sincere"],
  10751: ["Heartwarming", "Family-Friendly", "Wholesome"],
  14:    ["Magical", "Imaginative", "Epic"],
  36:    ["Authentic", "Epic", "Dramatic"],
  27:    ["Terrifying", "Intense", "Chilling"],
  10402: ["Musical", "Inspiring", "Soulful"],
  9648:  ["Mysterious", "Intriguing", "Suspenseful"],
  10749: ["Romantic", "Tender", "Heartwarming"],
  878:   ["Mind-Bending", "Futuristic", "Thrilling"],
  10770: ["Dramatic", "Intimate", "Personal"],
  53:    ["Suspenseful", "Gripping", "Intense"],
  10752: ["Heroic", "Intense", "Dramatic"],
  37:    ["Rugged", "Classic", "Adventurous"],
};

// Provider ID → URL for clickable platform buttons
const PLATFORM_URLS = {
  8:    "https://www.netflix.com",
  9:    "https://www.primevideo.com",
  10:   "https://www.amazon.com/video",
  337:  "https://www.disneyplus.com",
  350:  "https://tv.apple.com",
  384:  "https://www.max.com",
  1899: "https://www.max.com",
  15:   "https://www.hulu.com",
  386:  "https://www.peacocktv.com",
  387:  "https://www.peacocktv.com",
  531:  "https://www.paramountplus.com",
  283:  "https://www.crunchyroll.com",
  11:   "https://mubi.com",
  73:   "https://tubitv.com",
  2:    "https://www.apple.com/apple-tv-plus/",
};

/** Return up to 3 unique mood strings from a genres array. */
function getMoodTags(genres = []) {
  const tags = new Set();
  for (const g of genres) {
    const moods = GENRE_MOODS[g.id] || [];
    for (const m of moods) {
      tags.add(m);
      if (tags.size >= 3) break;
    }
    if (tags.size >= 3) break;
  }
  // Fill with genre names if we don't have 3 moods yet
  for (const g of genres) {
    if (tags.size >= 3) break;
    tags.add(g.name);
  }
  return [...tags];
}

/** Render genre IDs as mood tag HTML (inline dots, for search results). */
function renderMoodTagsFromIds(genreIds = []) {
  const genres = genreIds.map((id) => ({ id }));
  return getMoodTags(genres).map((t) => `<span class="mood-tag">${t}</span>`).join("");
}

/** POST JSON and return parsed response. */
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Show a self-dismissing toast notification. */
function showToast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => {
    t.style.animation = "toastOut .3s ease forwards";
    t.addEventListener("animationend", () => t.remove());
  }, 3200);
}

/** Render star widgets. Each star calls rateItem() on click. */
function renderStars(current, tmdbId, mediaType) {
  return `<div class="star-rating">${[1,2,3,4,5].map((n) => `
    <span class="star ${n <= (current||0) ? 'filled' : ''}"
          onclick="rateItem(${tmdbId},'${mediaType}',${n},this)">★</span>`
  ).join("")}</div>`;
}

async function rateItem(tmdbId, mediaType, rating, starEl) {
  const data = await apiPost("/api/watchlist/rate", { tmdb_id: tmdbId, media_type: mediaType, rating });
  if (data.success) {
    const container = starEl.closest(".star-rating");
    container.querySelectorAll(".star").forEach((s) =>
      s.classList.toggle("filled", parseInt(s.getAttribute("onclick").match(/,(\d),/)[1]) <= rating)
    );
    showToast(`Rated ${rating} ★`, "success");
  }
}

/** Scroll a row container left/right by direction (-1 or 1). */
function scrollRow(containerId, direction) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: "smooth" });
}

/** Render a horizontal row card (16:9 backdrop). */
function renderRowCard(item) {
  const id      = item.id;
  const type    = item.media_type;
  const title   = item.title || item.name || "";
  const year    = (item.release_date || item.first_air_date || "").slice(0, 4);
  const score   = item.vote_average ? item.vote_average.toFixed(1) : "";
  const imgSrc  = item.backdrop_path
    ? `${BACKDROP_BASE}${item.backdrop_path}`
    : (item.poster_path ? `${POSTER_BASE}${item.poster_path}` : "");

  const img = imgSrc
    ? `<img class="row-card-img" src="${imgSrc}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="row-card-placeholder">🎬</div>`;

  return `
<div class="row-card" onclick="location.href='/title/${type}/${id}'">
  ${img}
  <div class="row-card-overlay">
    <div class="row-card-title">${escHtml(title)}</div>
    <div class="row-card-meta">
      ${year ? `<span>${year}</span>` : ""}
      ${score ? `<span class="score-badge">⭐ ${score}</span>` : ""}
      <span class="type-badge">${type === "movie" ? "Movie" : "TV"}</span>
    </div>
  </div>
</div>`;
}

/** Render a poster card (2:3) for search results or browse. */
function renderPosterCard(item, inWatchlist = false) {
  const id    = item.id;
  const type  = item.media_type;
  const title = item.title || item.name || "";
  const year  = (item.release_date || item.first_air_date || "").slice(0, 4);
  const score = item.vote_average ? item.vote_average.toFixed(1) : "";

  const img = item.poster_path
    ? `<img class="poster-card-img" src="${POSTER_BASE}${item.poster_path}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="poster-card-placeholder">🎬</div>`;

  const moodHtml = renderMoodTagsFromIds(item.genre_ids || []);
  const provId   = `pc-prov-${id}-${type}`;
  const btnId    = `pc-btn-${id}-${type}`;
  const inList   = inWatchlist;

  return `
<div class="poster-card" id="pc-${id}-${type}">
  <div class="poster-card-img-wrap">
    <a href="/title/${type}/${id}">${img}</a>
  </div>
  <div class="poster-card-body">
    <a href="/title/${type}/${id}" class="poster-card-title">${escHtml(title)}</a>
    <div class="poster-card-meta">
      <span class="type-badge">${type === "movie" ? "Movie" : "TV"}</span>
      ${year  ? `<span>${year}</span>` : ""}
      ${score ? `<span class="score-badge">⭐ ${score}</span>` : ""}
    </div>
    <div class="mood-tags">${moodHtml}</div>
    <div class="card-providers" id="${provId}"></div>
    <div class="poster-card-actions">
      <button id="${btnId}" class="btn btn-sm ${inList ? 'btn-success' : 'btn-red'}"
        onclick="toggleWatchlistCard(${id},'${type}',${JSON.stringify(title)},${JSON.stringify(item.poster_path||'')},${JSON.stringify((item.overview||'').slice(0,300))},${JSON.stringify(item.release_date||item.first_air_date||'')},${item.vote_average||0})"
        ${inList ? "disabled" : ""}>
        ${inList ? "✓ In List" : "+ My List"}
      </button>
    </div>
  </div>
</div>`;
}

/** Add-to-watchlist handler called from poster cards. */
async function toggleWatchlistCard(tmdbId, mediaType, title, posterPath, overview, releaseDate, voteAverage) {
  const btn = document.getElementById(`pc-btn-${tmdbId}-${mediaType}`);
  if (btn) { btn.disabled = true; btn.textContent = "Adding…"; }

  const data = await apiPost("/api/watchlist/add", {
    tmdb_id: tmdbId, media_type: mediaType, title,
    poster_path: posterPath, overview, release_date: releaseDate, vote_average: voteAverage,
  });

  if (data.success) {
    if (btn) { btn.textContent = "✓ In List"; btn.className = "btn btn-sm btn-success"; }
    showToast(data.message, "success");
  } else {
    if (btn) { btn.disabled = false; btn.textContent = "+ My List"; }
    showToast(data.error || "Failed to add", "error");
  }
}

/** Fetch provider logos for a card and inject into container. */
async function loadCardProviders(tmdbId, mediaType, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const data = await fetch(`/api/providers/${tmdbId}?media_type=${mediaType}`).catch(() => null);
    // providers endpoint may not exist on this rebuild — use detail endpoint instead if needed
    if (!data) return;
    const json = await data.json().catch(() => null);
    if (!json || !json.providers) return;
    el.innerHTML = json.providers.slice(0, 5).map((p) =>
      p.logo_url
        ? `<img class="card-provider-logo" src="${p.logo_url}" alt="${p.name}" title="${p.name}">`
        : ""
    ).join("");
  } catch { /* non-fatal */ }
}

/** Trailer modal helpers. */
let _trailerKey = null;
function openTrailer(youtubeKey) {
  _trailerKey = youtubeKey;
  const modal  = document.getElementById("trailer-modal");
  const iframe = document.getElementById("trailer-modal-iframe");
  iframe.src   = `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0`;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeTrailer() {
  const modal  = document.getElementById("trailer-modal");
  const iframe = document.getElementById("trailer-modal-iframe");
  iframe.src   = "";
  modal.classList.remove("open");
  document.body.style.overflow = "";
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTrailer(); });

/** Escape HTML to prevent XSS when inserting titles into innerHTML. */
function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/** Format minutes → "2h 16m". */
function fmtRuntime(mins) {
  if (!mins) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ── Navbar behaviour ──────────────────────────────────────────────────────────
(function initNavbar() {
  const navbar = document.getElementById("navbar");
  const toggle = document.getElementById("search-toggle");
  const navSearch = document.getElementById("nav-search");
  const navInput  = document.getElementById("nav-search-input");

  // Darken navbar on scroll
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });

  // Expand search input on icon click
  if (toggle) {
    toggle.addEventListener("click", () => {
      navSearch.classList.toggle("open");
      if (navSearch.classList.contains("open")) navInput.focus();
    });
  }

  // Navigate on Enter in navbar search
  if (navInput) {
    navInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && navInput.value.trim()) {
        location.href = `/search#${encodeURIComponent(navInput.value.trim())}`;
      }
    });
  }
})();
