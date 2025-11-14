// script.js - robust fetch that handles APIs that limit page size
async function getGames() {
  try {
    // Try strategies: single large request, then fallback to multi-page
    const BASE = "https://debuggers-games-api.duckdns.org/api/games";
    const TRY_PAGE_SIZE = 100;      // desired page size for first attempt
    const MAX_PAGES = 10;           // safety limit for multi-page fetching
    const TIMEOUT_MS = 10000;

    // small timeout wrapper for fetch
    const fetchWithTimeout = (url, opts = {}) => {
      return Promise.race([
        fetch(url, opts),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), TIMEOUT_MS))
      ]);
    };

    // Try single request with page_size
    let allResults = [];
    try {
      const url = `${BASE}?page_size=${TRY_PAGE_SIZE}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (Array.isArray(json.results) && json.results.length > 0) {
        allResults = json.results.slice();
      } else {
        // some APIs may return the array directly (no results property)
        if (Array.isArray(json)) allResults = json.slice();
      }
    } catch (e) {
      console.warn("Single large request failed:", e.message);
      allResults = [];
    }

    if (allResults.length > 0 && allResults.length < TRY_PAGE_SIZE) {
      
      let page = 2;
      while (page <= MAX_PAGES) {
        try {
          const url = `${BASE}?page=${page}&page_size=${TRY_PAGE_SIZE}`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) break;
          const json = await res.json();
          let resultsPage = Array.isArray(json.results) ? json.results : (Array.isArray(json) ? json : []);
          if (!resultsPage || resultsPage.length === 0) break;
          allResults.push(...resultsPage);
          if (resultsPage.length < TRY_PAGE_SIZE) break;
          page++;
        } catch (err) {
          console.warn("Paged fetch stopped at page", page, ":", err.message);
          break;
        }
      }
    }

    if (allResults.length === 0) {
      let page = 1;
      while (page <= MAX_PAGES) {
        try {
          const url = `${BASE}?page=${page}&page_size=50`;
          const res = await fetchWithTimeout(url);
          if (!res.ok) break;
          const json = await res.json();
          let resultsPage = Array.isArray(json.results) ? json.results : (Array.isArray(json) ? json : []);
          if (!resultsPage || resultsPage.length === 0) break;
          allResults.push(...resultsPage);
          if (resultsPage.length < 50) break;
          page++;
        } catch (err) {
          console.warn("Fallback paged fetch failed at page", page, ":", err.message);
          break;
        }
      }
    }

    const dedupe = [];
    const seen = new Set();
    for (const g of allResults) {
      if (!g || !g.slug) continue;
      if (!seen.has(g.slug)) {
        dedupe.push(g);
        seen.add(g.slug);
      }
    }
    const results = dedupe.length ? dedupe : allResults;

    if (!results || results.length === 0) {
      console.error("No games retrieved from API. Check network/CORS or endpoint.");
      document.getElementById("games-grid").innerHTML = `<div class="col-span-full text-white p-6 text-center">No games found. Open devtools network to inspect the API response.</div>`;
      return;
    }

    const slider = document.getElementById("slider");
    const grid = document.getElementById("games-grid");

    slider.innerHTML = results
      .map(game => `
        <div class="min-w-full">
          <img src="${game.background_image}" alt="${escapeHtml(game.slug||'')}" class="w-full h-64 sm:h-80 object-cover" />
        </div>
      `).join("");

    let slideIndex = 0;
    const sliderChildren = slider.children;
    const totalSlides = sliderChildren.length || 1;

    function showSlide(i = slideIndex) {
      slider.style.transform = `translateX(-${i * 100}%)`;
    }

    function nextSlide() {
      slideIndex = (slideIndex + 1) % totalSlides;
      showSlide();
    }
    function prevSlide() {
      slideIndex = (slideIndex - 1 + totalSlides) % totalSlides;
      showSlide();
    }

    let auto = setInterval(nextSlide, 4000);
    const wrapper = document.getElementById("slider-wrapper");
    const nextBtn = document.getElementById("nextBtn");
    const prevBtn = document.getElementById("prevBtn");
    if (nextBtn) nextBtn.addEventListener("click", () => { nextSlide(); restartAuto(); });
    if (prevBtn) prevBtn.addEventListener("click", () => { prevSlide(); restartAuto(); });
    if (wrapper) {
      wrapper.addEventListener("mouseenter", () => clearInterval(auto));
      wrapper.addEventListener("mouseleave", () => { auto = setInterval(nextSlide, 4000); });
    }
    function restartAuto() { clearInterval(auto); auto = setInterval(nextSlide, 4000); }

    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    function toggleFavorite(game) {
      if (!game || !game.slug) return;
      const exists = favorites.some(f => f.slug === game.slug);
      if (exists) favorites = favorites.filter(f => f.slug !== game.slug);
      else favorites.push(game);
      localStorage.setItem("favorites", JSON.stringify(favorites));
    }

    function renderGames(pagedList) {
      const html = pagedList.map(game => {
        const genres = Array.isArray(game.genres) ? game.genres.map(g => g.name).join(", ") : "";
        const filled = favorites.some(f => f.slug === game.slug) ? "red" : "none";
        return `
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:scale-105 transition">
            <div class="relative">
              <img src="${escapeHtml(game.background_image||'')}" alt="${escapeHtml(game.slug||'')}" class="w-full h-40 object-cover" />
              <button class="like-btn absolute bottom-2 left-2" data-slug="${escapeHtml(game.slug||'')}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="${filled}" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.015-4.5-4.5-4.5S12 5.765 12 8.25c0-2.485-2.015-4.5-4.5-4.5S3 5.765 3 8.25c0 4.364 9 11.25 9 11.25s9-6.886 9-11.25z"/>
                </svg>
              </button>
              <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                ⭐ ${typeof game.rating === 'number' ? game.rating.toFixed(1) : (game.rating || '—')}
              </div>
            </div>
            <div class="p-2">
              <h4 class="font-bold text-gray-800 text-sm">${escapeHtml(game.slug||'')}</h4>
              <p class="text-gray-500 text-xs">${escapeHtml(genres)}</p>
            </div>
          </div>
        `;
      }).join("");
      grid.innerHTML = html;

      document.querySelectorAll(".like-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const slug = btn.dataset.slug;
          const gameObj = results.find(r => r.slug === slug);
          toggleFavorite(gameObj);
          const svg = btn.querySelector("svg");
          if (svg) svg.setAttribute("fill", favorites.some(f => f.slug === slug) ? "red" : "none");
        });
      });
    }

    let currentPage = 1;
    const pageSize = 15;
    let currentData = results.slice();

    function paginateGames() {
      const start = (currentPage - 1) * pageSize;
      const page = currentData.slice(start, start + pageSize);
      renderGames(page);
      const totalPages = Math.max(1, Math.ceil(currentData.length / pageSize));
      document.getElementById("pageInfo").textContent = `Page ${currentPage} / ${totalPages} (${currentData.length} total)`;
    }

    document.getElementById("nextPage").addEventListener("click", () => {
      const totalPages = Math.max(1, Math.ceil(currentData.length / pageSize));
      if (currentPage < totalPages) { currentPage++; paginateGames(); }
    });
    document.getElementById("prevPage").addEventListener("click", () => {
      if (currentPage > 1) { currentPage--; paginateGames(); }
    });

    function updateFilter(newList) {
      currentData = newList;
      currentPage = 1;
      paginateGames();
    }

    document.getElementById("all-btn").addEventListener("click", () => updateFilter(results));
    document.getElementById("rating-btn").addEventListener("click", () => updateFilter(results.filter(g => Number(g.rating) >= 4)));
    const genreInputEl = document.getElementById("genre-input");
    document.getElementById("gender-btn").addEventListener("click", () => {
      genreInputEl.classList.toggle("hidden");
      genreInputEl.focus();
      updateFilter(results);
    });
    genreInputEl.addEventListener("input", () => {
      const txt = genreInputEl.value.toLowerCase();
      updateFilter(results.filter(g => Array.isArray(g.genres) && g.genres.some(gg => gg.name.toLowerCase().includes(txt))));
    });

    paginateGames();

    function escapeHtml(str) {
      return String(str || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

  } catch (err) {
    console.error("getGames error:", err);
    document.getElementById("games-grid").innerHTML = `<div class="col-span-full text-white p-6 text-center">Error loading games: ${escapeHtml(err.message || String(err))}</div>`;
    function escapeHtml(str) { return String(str || "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  }
}

getGames();
