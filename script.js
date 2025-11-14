async function getGames() {
  try {
    const response = await fetch("https://debuggers-games-api.duckdns.org/api/games");
    const data = await response.json();
    const results = data.results || [];
    const grid = document.getElementById("games-grid");
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];

    function toggleFavorite(game) {
      const idx = favorites.findIndex(f => f.slug === game.slug);
      if (idx >= 0) favorites.splice(idx, 1);
      else favorites.push(game);
      localStorage.setItem("favorites", JSON.stringify(favorites));
    }

    function escapeHtml(str) {
      return String(str || "").replace(/[&<>"']/g, m =>
        ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
      );
    }

    // -------- Slider --------
    const slider = document.getElementById("slider");
    const sliderWrapper = document.getElementById("slider-wrapper");
    let slideIndex = 0;
    let autoSlide;

    function renderSlider(games) {
      slider.innerHTML = games.slice(0, 5) // first 5 games
        .map(game => `
          <div class="min-w-full flex-shrink-0">
            <img src="${escapeHtml(game.background_image||'')}" alt="${escapeHtml(game.slug||'')}" class="w-full h-72 object-cover sm:h-80 md:h-96"/>
          </div>
        `).join("");
      showSlide();
    }

    function showSlide() {
      slider.style.transform = `translateX(-${slideIndex * 100}%)`;
    }

    function startAutoSlide() {
      stopAutoSlide();
      autoSlide = setInterval(() => {
        slideIndex = (slideIndex + 1) % Math.min(5, results.length);
        showSlide();
      }, 4000);
    }

    function stopAutoSlide() {
      clearInterval(autoSlide);
    }

    document.getElementById("nextBtn").addEventListener("click", () => {
      slideIndex = (slideIndex + 1) % Math.min(5, results.length);
      showSlide();
      startAutoSlide();
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      slideIndex = (slideIndex - 1 + Math.min(5, results.length)) % Math.min(5, results.length);
      showSlide();
      startAutoSlide();
    });

    sliderWrapper.addEventListener("mouseenter", stopAutoSlide);
    sliderWrapper.addEventListener("mouseleave", startAutoSlide);

    renderSlider(results);
    startAutoSlide();

    // -------- Render Games --------
    function renderGames(pagedList) {
      const html = pagedList.map(game => {
        const genres = Array.isArray(game.genres) ? game.genres.map(g => g.name).join(", ") : "";
        const filled = favorites.some(f => f.slug === game.slug) ? "red" : "none";
        return `
          <div class="bg-white rounded-lg shadow-md overflow-hidden hover:scale-105 transition">
            <div class="relative">
              <img src="${escapeHtml(game.background_image || '')}" alt="${escapeHtml(game.slug || '')}" class="w-full h-40 object-cover" />
              <button class="like-btn absolute bottom-2 left-2" data-slug="${escapeHtml(game.slug || '')}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="${filled}" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.015-4.5-4.5-4.5S12 5.765 12 8.25c0-2.485-2.015-4.5-4.5-4.5S3 5.765 3 8.25c0 4.364 9 11.25 9 11.25s9-6.886 9-11.25z"/>
                </svg>
              </button>
              <div class="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                ⭐ ${typeof game.rating === 'number' ? game.rating.toFixed(1) : (game.rating || '—')}
              </div>
            </div>
            <div class="p-2">
              <h4 class="font-bold text-gray-800 text-sm">${escapeHtml(game.slug || '')}</h4>
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
          if (!gameObj) return;
          toggleFavorite(gameObj);
          const svg = btn.querySelector("svg");
          if (svg) svg.setAttribute("fill", favorites.some(f => f.slug === slug) ? "red" : "none");
        });
      });
    }

    // -------- Pagination --------
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
      renderSlider(newList); // update slider based on filtered list
    }

    // -------- Filters --------
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

    // -------- Initial Render --------
    paginateGames();

  } catch (err) {
    console.error("getGames error:", err);
    document.getElementById("games-grid").innerHTML = `<div class="col-span-full text-white p-6 text-center">Error loading games: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

getGames();
