/**
 * detail.js — fetches and renders the full detail page for a movie or TV show.
 */

const root      = document.getElementById("detail-root");
const tmdbId    = parseInt(root.dataset.tmdbId, 10);
const mediaType = root.dataset.mediaType;
const BACKDROP_LG = "https://image.tmdb.org/t/p/original";

let _detail = null;  // cached for Add to Watchlist handler

async function loadDetail() {
  try {
    const data = await fetch(`/api/detail/${mediaType}/${tmdbId}`).then((r) => r.json());
    if (data.error) throw new Error(data.error);
    _detail = data;
    render(data);
  } catch {
    document.getElementById("detail-skeleton").style.display = "none";
    document.getElementById("detail-error").style.display    = "block";
  }
}

function render(d) {
  document.title = `${d.title} — Watchlist`;

  // Backdrop
  const heroImg = document.getElementById("detail-hero-img");
  if (d.backdrop_path) heroImg.style.backgroundImage = `url(${BACKDROP_LG}${d.backdrop_path})`;

  // Badges
  document.getElementById("detail-badges").innerHTML = [
    `<span class="type-badge">${mediaType === "movie" ? "Movie" : "TV Show"}</span>`,
    d.content_rating ? `<span class="rating-badge">${escHtml(d.content_rating)}</span>` : "",
  ].join("");

  // Title
  document.getElementById("detail-title").textContent = d.title;

  // Meta row: year · runtime · score
  const year    = (d.release_date || "").slice(0, 4);
  const runtime = fmtRuntime(d.runtime);
  const score   = d.vote_average ? `⭐ ${d.vote_average.toFixed(1)}` : "";
  const votes   = d.vote_count   ? `(${d.vote_count.toLocaleString()} votes)` : "";
  document.getElementById("detail-meta-row").innerHTML = [year, runtime, score, votes]
    .filter(Boolean)
    .map((v) => `<span>${escHtml(v)}</span>`)
    .join('<span style="color:var(--border)">·</span>');

  // Mood tags from genres
  const moods = getMoodTags(d.genres || []);
  document.getElementById("detail-mood-tags").innerHTML =
    moods.map((m) => `<span class="detail-mood-tag">${escHtml(m)}</span>`).join("");

  // Overview
  document.getElementById("detail-overview").textContent = d.overview || "No synopsis available.";

  // Languages
  const langs = (d.languages || []).join(", ");
  const langEl = document.getElementById("detail-languages");
  if (langs) langEl.innerHTML = `<strong>Languages:</strong> ${escHtml(langs)}`;
  else langEl.style.display = "none";

  // Trailer button (hero) + inline trailer section
  if (d.trailer?.key) {
    window._detailTrailerKey = d.trailer.key;
    const heroBtn = document.getElementById("detail-trailer-btn");
    heroBtn.style.display = "inline-flex";

    const trailerSec = document.getElementById("trailer-section");
    trailerSec.style.display = "block";
    document.getElementById("detail-trailer-iframe").src =
      `https://www.youtube-nocookie.com/embed/${d.trailer.key}?rel=0`;
  }

  // Watchlist button state
  checkInList();

  // Providers
  if (d.providers?.length) {
    document.getElementById("providers-section").style.display = "block";
    document.getElementById("provider-pills").innerHTML = d.providers.map((p) => {
      const url = PLATFORM_URLS[p.provider_id] || "#";
      const img = p.logo_url
        ? `<img src="${p.logo_url}" alt="${escHtml(p.name)}" width="28" height="28" style="border-radius:6px;object-fit:cover">`
        : "";
      return `<a class="provider-pill" href="${url}" target="_blank" rel="noopener">
        ${img}<span>${escHtml(p.name)}</span></a>`;
    }).join("");
  }

  // Cast
  if (d.cast?.length) {
    document.getElementById("cast-section").style.display = "block";
    document.getElementById("cast-row").innerHTML = d.cast.map((m) => {
      const photo = m.profile_path
        ? `<img class="cast-photo" src="${PROFILE_BASE}${m.profile_path}" alt="${escHtml(m.name)}" loading="lazy">`
        : `<div class="cast-placeholder">👤</div>`;
      return `<div class="cast-card">${photo}
        <div class="cast-name">${escHtml(m.name)}</div>
        <div class="cast-character">${escHtml(m.character || "")}</div>
      </div>`;
    }).join("");
  }

  // Similar
  const filteredSimilar = (d.similar || []).filter((r) => r.backdrop_path || r.poster_path);
  if (filteredSimilar.length) {
    document.getElementById("similar-section").style.display = "block";
    document.getElementById("similar-cards").innerHTML = filteredSimilar.map(renderRowCard).join("");
  }

  // Recommendations
  const filteredRecs = (d.recommendations || []).filter((r) => r.backdrop_path || r.poster_path);
  if (filteredRecs.length) {
    document.getElementById("recs-section").style.display = "block";
    document.getElementById("recs-cards").innerHTML = filteredRecs.map(renderRowCard).join("");
  }

  // Show content
  document.getElementById("detail-skeleton").style.display = "none";
  document.getElementById("detail-content").style.display  = "block";
}

async function checkInList() {
  try {
    const data = await fetch("/api/watchlist").then((r) => r.json());
    const inList = (data.items || []).some((i) => i.tmdb_id === tmdbId && i.media_type === mediaType);
    setAddBtn(inList);
  } catch { /* non-fatal */ }
}

function setAddBtn(inList) {
  const btn = document.getElementById("detail-add-btn");
  if (!btn) return;
  btn.textContent = inList ? "✓ In My List" : "+ My List";
  btn.className   = inList ? "btn btn-success" : "btn btn-outline-white";
  btn.disabled    = inList;
}

async function detailAddToWatchlist() {
  if (!_detail) return;
  const btn = document.getElementById("detail-add-btn");
  btn.disabled = true; btn.textContent = "Adding…";

  const result = await apiPost("/api/watchlist/add", {
    tmdb_id:      _detail.id,
    media_type:   mediaType,
    title:        _detail.title,
    poster_path:  _detail.poster_path,
    overview:     _detail.overview,
    release_date: _detail.release_date,
    vote_average: _detail.vote_average,
  });

  if (result.success) {
    setAddBtn(true);
    showToast(result.message, "success");
  } else {
    btn.disabled = false; btn.textContent = "+ My List";
    showToast(result.error || "Failed to add", "error");
  }
}

function openDetailTrailer() {
  if (window._detailTrailerKey) openTrailer(window._detailTrailerKey);
}

loadDetail();
