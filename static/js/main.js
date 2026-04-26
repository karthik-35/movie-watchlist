/**
 * main.js — shared utilities, constants, and card renderers used by all pages.
 */

const POSTER_BASE   = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const PROFILE_BASE  = "https://image.tmdb.org/t/p/w185";
const LOGO_BASE     = "https://image.tmdb.org/t/p/original";

// Genre ID → mood descriptors
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

// Provider ID → homepage URL
const PLATFORM_URLS = {
  8:    "https://www.netflix.com",
  9:    "https://www.primevideo.com",
  10:   "https://www.primevideo.com",
  119:  "https://www.primevideo.com",
  337:  "https://www.disneyplus.com",
  350:  "https://tv.apple.com",
  2:    "https://tv.apple.com",
  384:  "https://www.max.com",
  1899: "https://www.max.com",
  31:   "https://www.max.com",
  15:   "https://www.hulu.com",
  386:  "https://www.peacocktv.com",
  387:  "https://www.peacocktv.com",
  531:  "https://www.paramountplus.com",
  582:  "https://www.paramountplus.com",
  257:  "https://www.fubo.tv",
  243:  "https://www.philo.com",
  246:  "https://www.mgmplus.com",
  283:  "https://www.crunchyroll.com",
  11:   "https://mubi.com",
  73:   "https://tubitv.com",
  1870: "https://www.zee5.com",
  232:  "https://www.zee5.com",
  1075: "https://www.aha.video",
  1516: "https://www.aha.video",
  220:  "https://www.etvwin.com",
};

const PLATFORM_URLS_BY_NAME = {
  "netflix":       "https://www.netflix.com",
  "prime video":   "https://www.primevideo.com",
  "amazon":        "https://www.primevideo.com",
  "disney":        "https://www.disneyplus.com",
  "hotstar":       "https://www.hotstar.com",
  "apple tv":      "https://tv.apple.com",
  "max":           "https://www.max.com",
  "hbo":           "https://www.max.com",
  "hulu":          "https://www.hulu.com",
  "peacock":       "https://www.peacocktv.com",
  "paramount":     "https://www.paramountplus.com",
  "zee5":          "https://www.zee5.com",
  "aha":           "https://www.aha.video",
  "etv win":       "https://www.etvwin.com",
  "etv":           "https://www.etvwin.com",
  "crunchyroll":   "https://www.crunchyroll.com",
  "mubi":          "https://mubi.com",
  "tubi":          "https://tubitv.com",
  "fubo":          "https://www.fubo.tv",
};

// Provider ID → search URL function
const PLATFORM_SEARCH_URLS = {
  8:    (q) => `https://www.netflix.com/search?q=${q}`,
  9:    (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  10:   (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  119:  (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  337:  (q) => `https://www.disneyplus.com/search/${q}`,
  350:  (q) => `https://tv.apple.com/search?term=${q}`,
  2:    (q) => `https://tv.apple.com/search?term=${q}`,
  384:  (q) => `https://www.max.com/search?q=${q}`,
  1899: (q) => `https://www.max.com/search?q=${q}`,
  31:   (q) => `https://www.max.com/search?q=${q}`,
  15:   (q) => `https://www.hulu.com/search?q=${q}`,
  386:  (q) => `https://www.peacocktv.com/search?q=${q}`,
  387:  (q) => `https://www.peacocktv.com/search?q=${q}`,
  531:  (q) => `https://www.paramountplus.com/search/${q}`,
  582:  (q) => `https://www.paramountplus.com/search/${q}`,
  1870: (q) => `https://www.zee5.com/search?q=${q}`,
  232:  (q) => `https://www.zee5.com/search?q=${q}`,
  1075: (q) => `https://www.aha.video/search?q=${q}`,
  1516: (q) => `https://www.aha.video/search?q=${q}`,
  220:  (q) => `https://www.etvwin.com/search?q=${q}`,
};

const PLATFORM_SEARCH_BY_NAME = {
  "netflix":     (q) => `https://www.netflix.com/search?q=${q}`,
  "prime video": (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  "amazon":      (q) => `https://www.amazon.com/s?k=${q}&i=instant-video`,
  "disney":      (q) => `https://www.disneyplus.com/search/${q}`,
  "hotstar":     (q) => `https://www.hotstar.com/in/search?q=${q}`,
  "apple tv":    (q) => `https://tv.apple.com/search?term=${q}`,
  "max":         (q) => `https://www.max.com/search?q=${q}`,
  "hbo":         (q) => `https://www.max.com/search?q=${q}`,
  "hulu":        (q) => `https://www.hulu.com/search?q=${q}`,
  "peacock":     (q) => `https://www.peacocktv.com/search?q=${q}`,
  "paramount":   (q) => `https://www.paramountplus.com/search/${q}`,
  "zee5":        (q) => `https://www.zee5.com/search?q=${q}`,
  "aha":         (q) => `https://www.aha.video/search?q=${q}`,
  "etv win":     (q) => `https://www.etvwin.com/search?q=${q}`,
  "etv":         (q) => `https://www.etvwin.com/search?q=${q}`,
};

/**
 * Get the best URL for a platform button, preferring search links.
 * Returns null if no URL found.
 */
function getPlatformUrl(provider, title) {
  const q = title ? encodeURIComponent(title).replace(/%20/g, "+") : "";
  const id = provider.provider_id;
  const nameLower = (provider.name || "").toLowerCase();

  if (q && PLATFORM_SEARCH_URLS[id]) return PLATFORM_SEARCH_URLS[id](q);

  if (q) {
    for (const [key, fn] of Object.entries(PLATFORM_SEARCH_BY_NAME)) {
      if (nameLower.includes(key)) return fn(q);
    }
  }

  if (PLATFORM_URLS[id]) return PLATFORM_URLS[id];

  for (const [key, url] of Object.entries(PLATFORM_URLS_BY_NAME)) {
    if (nameLower.includes(key)) return url;
  }
  return null;
}

// Suffixes to strip when deduplicating provider names
const PROVIDER_NOISE = [
  / with ads$/i, / premium$/i, / basic$/i, / standard$/i,
  / amazon channel$/i, / apple channel$/i, / roku channel$/i,
  / channel$/i, / plus$/i,
];

/** Remove near-duplicate providers (e.g. "Netflix" vs "Netflix Basic with Ads"). */
function deduplicateProviders(providers) {
  const seen = new Map();
  for (const p of providers) {
    let base = p.name || "";
    for (const re of PROVIDER_NOISE) base = base.replace(re, "").trim();
    const key = base.toLowerCase();
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()];
}

// ── Infinite-loop row state ────────────────────────────────────────────────────
const _rowState = {};

/**
 * Initialise a row container with tripled items for seamless infinite scroll.
 * Requires ≥36 items; pads by repeating if needed.
 */
function initInfiniteRow(containerId, items, renderFn) {
  const el = document.getElementById(containerId);
  if (!el || !items.length) return;

  // Pad to at least 36 items
  let src = [...items];
  while (src.length < 36) src = [...src, ...items];
  src = src.slice(0, Math.max(36, src.length));

  // Triple: A | B | C  — we start at B
  el.innerHTML = [...src, ...src, ...src].map(renderFn).join("");
  _rowState[containerId] = { len: src.length, cardW: null };

  requestAnimationFrame(() => {
    const firstCard = el.querySelector(".row-card, .top10-item");
    if (!firstCard) return;
    const style  = getComputedStyle(el);
    const gap    = parseFloat(style.gap) || 8;
    const cardW  = firstCard.offsetWidth + gap;
    _rowState[containerId].cardW = cardW;

    el.style.scrollBehavior = "auto";
    el.scrollLeft = src.length * cardW; // position at copy B
    requestAnimationFrame(() => { el.style.scrollBehavior = ""; });
  });
}

/** Scroll an infinite row left (-1) or right (1). */
function scrollRow(containerId, direction) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const state = _rowState[containerId];
  if (!state || !state.cardW) {
    // Non-infinite row fallback
    el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: "smooth" });
    return;
  }

  const { len, cardW } = state;
  const pageW  = el.clientWidth * 0.75;
  const lo     = len * cardW;          // start of copy B
  const hi     = 2 * len * cardW;     // start of copy C
  const target = el.scrollLeft + direction * pageW;

  if (target >= hi) {
    el.style.scrollBehavior = "auto";
    el.scrollLeft -= len * cardW;
    el.getBoundingClientRect(); // force layout
    el.style.scrollBehavior = "";
  } else if (target < lo) {
    el.style.scrollBehavior = "auto";
    el.scrollLeft += len * cardW;
    el.getBoundingClientRect();
    el.style.scrollBehavior = "";
  }
  el.scrollBy({ left: direction * pageW, behavior: "smooth" });
}

// ── Card renderers ────────────────────────────────────────────────────────────

/** Render a horizontal row card (16:9 backdrop). Title always visible. */
function renderRowCard(item) {
  const id      = item.id;
  const type    = item.media_type;
  const title   = item.title || item.name || "";
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
  </div>
</div>`;
}

/** Render a Top 10 item with giant outlined rank number. */
function renderTop10Card(item, rank) {
  const id    = item.id;
  const type  = item.media_type;
  const title = item.title || item.name || "";
  const src   = item.poster_path ? `${POSTER_BASE}${item.poster_path}` : "";

  const img = src
    ? `<img class="top10-card-img" src="${src}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="top10-card-placeholder">🎬</div>`;

  return `
<div class="top10-item">
  <span class="top10-num">${rank}</span>
  <a href="/title/${type}/${id}" class="top10-card-link" title="${escHtml(title)}">${img}</a>
</div>`;
}

/** Render a poster card (2:3) for search results — poster image + title only. */
function renderPosterCard(item) {
  const id    = item.id;
  const type  = item.media_type;
  const title = item.title || item.name || "";

  const img = item.poster_path
    ? `<img class="poster-card-img" src="${POSTER_BASE}${item.poster_path}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="poster-card-placeholder">🎬</div>`;

  return `
<div class="poster-card" onclick="location.href='/title/${type}/${id}'">
  <div class="poster-card-img-wrap">${img}</div>
  <div class="poster-card-body">
    <span class="poster-card-title">${escHtml(title)}</span>
  </div>
</div>`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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
  for (const g of genres) {
    if (tags.size >= 3) break;
    tags.add(g.name);
  }
  return [...tags];
}

/** Render genre IDs as mood tag HTML. */
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

/** Render star widgets. */
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
    const data = await fetch(`/api/providers/${tmdbId}?media_type=${mediaType}`);
    if (!data.ok) return;
    const json = await data.json();
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
  iframe.src   = `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0&fs=1`;
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

/**
 * Hero "Play" button — builds a fullscreen overlay div with the YouTube
 * embed and immediately requests fullscreen on the div (not the iframe).
 * Must be called directly from a click handler so the browser treats it
 * as a user gesture.
 */
function openHeroTrailer(youtubeKey) {
  // Remove any stale overlay from a previous play
  const prev = document.getElementById("hero-video-overlay");
  if (prev) { prev._cleanup?.(); prev.remove(); }

  // Build overlay
  const overlay = document.createElement("div");
  overlay.id = "hero-video-overlay";
  overlay.className = "hero-video-overlay";

  // YouTube iframe
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&fs=1&modestbranding=1&rel=0`;
  iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen");
  iframe.setAttribute("allowfullscreen", "");
  iframe.className = "hero-video-iframe";

  overlay.appendChild(iframe);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  // ── Request fullscreen on the div synchronously within the click gesture ──
  if (overlay.requestFullscreen) {
    overlay.requestFullscreen().catch(() => {});
  } else if (overlay.webkitRequestFullscreen) {
    overlay.webkitRequestFullscreen();
  } else if (overlay.mozRequestFullScreen) {
    overlay.mozRequestFullScreen();
  }

  // ── ESC / fullscreen-exit listeners ──────────────────────────────────────
  function onKeyDown(e) {
    if (e.key === "Escape") closeHeroTrailer();
  }
  function onFsChange() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      closeHeroTrailer();
    }
  }
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  overlay._cleanup = () => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("fullscreenchange", onFsChange);
    document.removeEventListener("webkitfullscreenchange", onFsChange);
  };
}

function closeHeroTrailer() {
  const overlay = document.getElementById("hero-video-overlay");
  if (!overlay) return;
  overlay._cleanup?.();
  overlay.remove();
  document.body.style.overflow = "";
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitFullscreenElement) {
    document.webkitExitFullscreen();
  }
}

/** Request fullscreen on the trailer iframe — called from the modal's Full Screen button. */
function requestTrailerFullscreen() {
  const iframe = document.getElementById("trailer-modal-iframe");
  if (iframe.requestFullscreen) {
    iframe.requestFullscreen().catch(() => {});
  } else if (iframe.webkitRequestFullscreen) {
    iframe.webkitRequestFullscreen();
  } else if (iframe.mozRequestFullScreen) {
    iframe.mozRequestFullScreen();
  }
}

function closeTrailer() {
  const modal  = document.getElementById("trailer-modal");
  const iframe = document.getElementById("trailer-modal-iframe");
  iframe.src   = "";
  modal.classList.remove("open");
  document.body.style.overflow = "";
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (document.webkitFullscreenElement) {
    document.webkitExitFullscreen();
  }
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTrailer(); });

/** Escape HTML to prevent XSS. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format minutes → "2h 16m". */
function fmtRuntime(mins) {
  if (!mins) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

// ── Navbar behaviour ──────────────────────────────────────────────────────────
(function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const toggle    = document.getElementById("search-toggle");
  const navSearch = document.getElementById("nav-search");
  const navInput  = document.getElementById("nav-search-input");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }, { passive: true });

  if (toggle) {
    toggle.addEventListener("click", () => {
      navSearch.classList.toggle("open");
      if (navSearch.classList.contains("open")) navInput.focus();
    });
  }

  if (navInput) {
    navInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && navInput.value.trim()) {
        location.href = `/search#${encodeURIComponent(navInput.value.trim())}`;
      }
    });
  }
})();
