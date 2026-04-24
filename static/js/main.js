/**
 * main.js — shared utilities used by both search.js and watchlist.js
 */

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";

/** Show a temporary toast notification at the bottom-right corner. */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "fadeOut .3s ease forwards";
    toast.addEventListener("animationend", () => toast.remove());
  }, 3000);
}

/** Render star rating HTML (read-only if readOnly=true). */
function renderStars(currentRating, tmdbId, mediaType, readOnly = false) {
  const stars = [1, 2, 3, 4, 5].map((n) => {
    const filled = n <= (currentRating || 0) ? "filled" : "";
    if (readOnly) {
      return `<span class="star ${filled}">★</span>`;
    }
    return `<span
      class="star ${filled}"
      data-value="${n}"
      data-id="${tmdbId}"
      data-type="${mediaType}"
      onclick="rateItem(${tmdbId}, '${mediaType}', ${n}, this)"
    >★</span>`;
  });
  return `<div class="star-rating">${stars.join("")}</div>`;
}

/** POST helper that sends JSON and returns parsed response JSON. */
async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

/**
 * Fetch OTT providers for a title and return an HTML snippet.
 * Appends the result into the element with id `containerId`.
 */
async function loadProviders(tmdbId, mediaType, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  try {
    const data = await fetch(
      `/api/providers/${tmdbId}?media_type=${mediaType}`
    ).then((r) => r.json());

    if (!data.providers || data.providers.length === 0) {
      el.innerHTML = `<span class="provider-name" style="font-size:.7rem">Not on streaming</span>`;
      return;
    }

    el.innerHTML = data.providers
      .slice(0, 6) // cap at 6 logos so the card doesn't overflow
      .map((p) =>
        p.logo_url
          ? `<img class="provider-logo" src="${p.logo_url}" alt="${p.name}" title="${p.name}">`
          : `<span class="provider-name">${p.name}</span>`
      )
      .join("");
  } catch {
    el.innerHTML = "";
  }
}

/** Rate a watchlist item and refresh the star display. */
async function rateItem(tmdbId, mediaType, rating, starEl) {
  const data = await apiPost("/api/watchlist/rate", {
    tmdb_id: tmdbId,
    media_type: mediaType,
    rating,
  });
  if (data.success) {
    // Update all stars in the same star-rating container
    const container = starEl.closest(".star-rating");
    container.querySelectorAll(".star").forEach((s) => {
      s.classList.toggle("filled", parseInt(s.dataset.value) <= rating);
    });
    showToast(`Rated ${rating} ★`, "success");
  } else {
    showToast("Rating failed", "error");
  }
}

/** Truncate long overviews. */
function truncate(text, max = 120) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/** Format "2024-03-15" → "2024". */
function releaseYear(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : "N/A";
}
