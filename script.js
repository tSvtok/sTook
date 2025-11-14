// Fetch games and build slider + grid
async function getGames() {
  try {
    const response = await fetch("https://debuggers-games-api.duckdns.org/api/games");
    const data = await response.json();

    // ----------------------
    // 1️⃣ Slider
    // ----------------------
    const slider = document.getElementById("slider");

    slider.innerHTML = data.results
      .map(game => `
        <div class="min-w-full">
          <img src="${game.background_image}" 
               alt="${game.slug}" 
               class="w-full h-72 object-cover" />
        </div>
      `).join("");

    // Slider logic
    let index = 0;
    const totalSlides = slider.children.length;
    let autoSlide;

    function showSlide() {
      slider.style.transform = `translateX(-${index * 100}%)`;
    }

    function startAutoSlide() {
      autoSlide = setInterval(() => {
        index = (index + 1) % totalSlides;
        showSlide();
      }, 1500);
    }

    function stopAutoSlide() {
      clearInterval(autoSlide);
    }

    document.getElementById("nextBtn").addEventListener("click", () => {
      index = (index + 1) % totalSlides;
      showSlide();
    });

    document.getElementById("prevBtn").addEventListener("click", () => {
      index = (index - 1 + totalSlides) % totalSlides;
      showSlide();
    });

    const sliderWrapper = document.getElementById("slider-wrapper");
    sliderWrapper.addEventListener("mouseenter", startAutoSlide);
    sliderWrapper.addEventListener("mouseleave", stopAutoSlide);

    // ----------------------
    // 2️⃣ Grid with Like + Comments
    // ----------------------
    const grid = document.getElementById("games-grid");

    grid.innerHTML = data.results
      .map((game, idx) => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden hover:scale-105 transition-transform duration-300 relative">
          <!-- Image -->
          <img src="${game.background_image}" alt="${game.slug}" class="w-full h-40 object-cover" />

          <!-- Game info -->
          <div class="p-2">
            <h4 class="font-bold text-gray-800 text-sm sm:text-base">${game.slug}</h4>
            <p class="text-gray-500 text-xs sm:text-sm">${game.genres.map(g => g.name).join(', ')}</p>

            <!-- Like button -->
            <button class="like-btn mt-2 flex items-center text-pink-500 hover:text-pink-600 transition text-sm" data-id="${idx}">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.015-4.5-4.5-4.5S12 5.765 12 8.25c0-2.485-2.015-4.5-4.5-4.5S3 5.765 3 8.25c0 4.364 9 11.25 9 11.25s9-6.886 9-11.25z"/>
              </svg>
              <span>Like</span>
            </button>

            <!-- Comments -->
            <div class="mt-2">
              <input type="text" placeholder="Add a comment..." 
                     class="w-full text-xs sm:text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" />
            </div>
          </div>
        </div>
      `).join("");

    // Like button click events
    document.querySelectorAll(".like-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("text-pink-700"); // toggle color
        if(btn.innerText === "Like") btn.innerText = "Liked";
        else btn.innerText = "Like";
      });
    });

  } catch (error) {
    console.error("Error fetching games:", error);
  }
}

getGames();
