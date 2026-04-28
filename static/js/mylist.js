/**
 * mylist.js — My List page: 6-column landscape grid, Netflix-style.
 */

const gridEl  = document.getElementById("mylist-grid");
const emptyEl = document.getElementById("mylist-empty");

async function loadList() {
  gridEl.innerHTML = skeletons(12);
  try {
    const data  = await fetch("/api/watchlist").then((r) => r.json());
    const items = data.items || [];
    renderItems(items);
  } catch {
    gridEl.innerHTML = `<p style="padding:2rem;color:var(--red)">Failed to load list.</p>`;
  }
}

function renderItems(items) {
  if (!items.length) {
    gridEl.innerHTML = "";
    emptyEl.style.display = "flex";
    return;
  }
  emptyEl.style.display = "none";
  gridEl.innerHTML = items.map(renderMyListCard).join("");
}

function renderMyListCard(item) {
  const { tmdb_id, media_type, title, poster_path, backdrop_path } = item;

  const imgSrc = backdrop_path
    ? `${BACKDROP_BASE}${backdrop_path}`
    : (poster_path ? `${POSTER_BASE}${poster_path}` : "");

  const img = imgSrc
    ? `<img class="mylist-card-img" src="${imgSrc}" alt="${escHtml(title)}" loading="lazy">`
    : `<div class="mylist-card-placeholder">🎬</div>`;

  return `
<div class="mylist-card" id="ml-${tmdb_id}-${media_type}"
     onclick="location.href='/title/${media_type}/${tmdb_id}'">
  ${img}
  <div class="mylist-card-title">${escHtml(title)}</div>
  <button class="mylist-remove-btn" title="Remove from My List"
          onclick="event.stopPropagation(); removeItem(${tmdb_id},'${media_type}')">✕</button>
</div>`;
}

async function removeItem(tmdbId, mediaType) {
  const data = await apiPost("/api/watchlist/remove", { tmdb_id: tmdbId, media_type: mediaType });
  if (data.success) {
    const card = document.getElementById(`ml-${tmdbId}-${mediaType}`);
    if (card) {
      card.style.transition = "opacity .3s, transform .3s";
      card.style.opacity    = "0";
      card.style.transform  = "scale(.9)";
      card.addEventListener("transitionend", () => {
        card.remove();
        if (!gridEl.querySelector(".mylist-card")) loadList();
      });
    }
    showToast("Removed from My List", "info");
  } else {
    showToast("Failed to remove", "error");
  }
}

function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="mylist-card">
      <div class="skeleton" style="aspect-ratio:16/9;width:100%"></div>
    </div>`).join("");
}

loadList();
