import { getResizedImageUrl } from "./utils.js";
import { initApp } from './app.js';
import { callFunction } from "./apiService.js";

let allPartners = []; // Cache for map and re-renders without fetching

const loadingContainer = document.getElementById("loading-container");
const grid = document.getElementById("partners-grid");
const noResultsMessage = document.getElementById("no-results-message");

let map;
let infoWindow;
let markers = [];

/**
 * Loads the Google Maps script dynamically.
 * @param {string} apiKey The Google Maps API Key.
 * @returns {Promise<void>}
 */
function loadGoogleMapsScript(apiKey) {
    if (window.google && window.google.maps) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}


/**
 * Initializes the map and adds markers for partners.
 * @param {Array} partnersData - The list of partners to display on the map.
 */
function initMap(partnersData) {
    const mapContainer = document.getElementById('map');
    if (!mapContainer || !window.google) return;
    
    // Dark mode styles for Google Maps from Snazzy Maps
    const mapStyles = [ { "elementType": "geometry", "stylers": [ { "color": "#242f3e" } ] }, { "elementType": "labels.text.fill", "stylers": [ { "color": "#746855" } ] }, { "elementType": "labels.text.stroke", "stylers": [ { "color": "#242f3e" } ] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#263c3f" } ] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [ { "color": "#6b9a76" } ] }, { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#38414e" } ] }, { "featureType": "road", "elementType": "geometry.stroke", "stylers": [ { "color": "#212a37" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#9ca5b3" } ] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "color": "#746855" } ] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [ { "color": "#1f2835" } ] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [ { "color": "#f3d19c" } ] }, { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#2f3948" } ] }, { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#17263c" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#515c6d" } ] }, { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [ { "color": "#17263c" } ] } ];

    map = new google.maps.Map(mapContainer, {
        center: { lat: -14.235, lng: -51.9253 }, // Center of Brazil
        zoom: 4,
        styles: mapStyles,
        mapTypeControl: false,
    });

    infoWindow = new google.maps.InfoWindow();

    updateMarkers(partnersData);
}

/**
 * Updates markers on the map.
 * @param {Array} partnersData The data for the markers.
 */
function updateMarkers(partnersData) {
    if (!map) return;
    
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    partnersData.forEach(partner => {
        // Assume partner documents have latitude and longitude fields
        if (partner.latitude && partner.longitude) {
            const marker = new google.maps.Marker({
                position: { lat: partner.latitude, lng: partner.longitude },
                map: map,
                title: partner.businessName,
            });

            marker.addListener('click', () => {
                const content = `
                    <div class="text-slate-900 p-1 max-w-xs">
                        <h4 class="font-bold text-base">${partner.businessName}</h4>
                        <p class="text-sm">${partner.city}, ${partner.state}</p>
                        <a href="/ad_details.html?id=${partner.id}" target="_blank" class="text-cyan-600 font-semibold text-sm hover:underline">Ver detalhes</a>
                    </div>`;
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
            });
            markers.push(marker);
        }
    });
}

/**
 * Renders the list of partners in the grid.
 * @param {Array} partners - The list of partners to render.
 */
function renderPartners(partners) {
  grid.innerHTML = "";

  if (partners.length === 0) {
    noResultsMessage.classList.remove("hidden");
    grid.classList.add("hidden");
  } else {
    noResultsMessage.classList.add("hidden");
    grid.classList.remove("hidden");
    partners.forEach((partner) => {
      const card = document.createElement("a");
      card.href = `/ad_details.html?id=${partner.id}`;
      card.className = "bg-slate-800 rounded-2xl overflow-hidden flex flex-col card-hover";
      
      const verifiedBadge = partner.verified 
        ? ' <i class="fas fa-check-circle text-blue-400 text-sm" title="Parceiro Verificado"></i>'
        : "";
        
      const ratingHTML = partner.averageRating
        ? `<div class="flex items-center text-xs">
             <i class="fas fa-star text-amber-400 mr-1"></i>
             <span class="font-bold text-white">${partner.averageRating.toFixed(1)}</span>
             <span class="text-slate-400 ml-1">(${partner.reviewCount || 0})</span>
           </div>`
        : ``;

      card.innerHTML = `
        <div class="relative overflow-hidden h-48">
          <img src="${getResizedImageUrl(partner.image, "400x300") || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${partner.businessName}" loading="lazy" decoding="async" class="w-full h-full object-cover">
        </div>
        <div class="p-4 flex flex-col flex-grow">
          <h3 class="text-lg font-bold text-white">${partner.businessName}${verifiedBadge}</h3>
          <p class="text-sm text-amber-400 capitalize">${(partner.category || "").replace(/_/g, " ")}</p>
          <div class="flex justify-between items-center mt-2 flex-grow">
            <p class="text-xs text-slate-400"><i class="fas fa-map-marker-alt mr-2"></i>${partner.city}, ${partner.state}</p>
            ${ratingHTML}
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  }
}

/**
 * Executes the search by calling the Cloud Function.
 */
async function performSearch() {
  loadingContainer.classList.remove("hidden");
  grid.classList.add("hidden");
  noResultsMessage.classList.add("hidden");
  
  const searchText = document.getElementById("search-text").value;
  const category = document.getElementById("filter-category").value;
  
  try {
    const partners = await callFunction('searchPartners', { text: searchText, category: category });
    
    allPartners = partners; // Update local cache
    renderPartners(partners);

    // Update the map with the new filtered partners
    if (window.google && map) {
        updateMarkers(partners);
    }

  } catch (error) {
    console.error("Erro ao buscar parceiros:", error);
    loadingContainer.innerHTML = '<p class="text-red-400 text-center col-span-full">Não foi possível carregar os parceiros. Tente novamente mais tarde.</p>';
  } finally {
    loadingContainer.classList.add("hidden");
  }
}

// Main initialization logic
document.addEventListener("DOMContentLoaded", async () => {
    initApp();

    // Fetch config and load Google Maps script first
    try {
        const config = await callFunction('getFrontendConfig');
        const apiKey = config.googleMapsApiKey;
        await loadGoogleMapsScript(apiKey);
        initMap([]); // Initialize map empty before the first search
    } catch (error) {
        console.error("Falha ao carregar o Google Maps:", error);
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-center p-4 text-red-400">Não foi possível carregar o mapa.</p></div>';
        }
    }
    
    performSearch(); // Initial load

    const searchInput = document.getElementById("search-text");
    const categorySelect = document.getElementById("filter-category");
    const clearFiltersBtn = document.getElementById("clear-filters-btn");
    const clearFiltersEmptyBtn = document.getElementById("clear-filters-btn-empty");

    let searchTimeout;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(performSearch, 500); // Debounce
    });

    categorySelect.addEventListener("change", performSearch);

    const clear = () => {
        searchInput.value = "";
        categorySelect.value = "";
        performSearch();
    };

    clearFiltersBtn.addEventListener("click", clear);
    clearFiltersEmptyBtn.addEventListener("click", clear);
});
