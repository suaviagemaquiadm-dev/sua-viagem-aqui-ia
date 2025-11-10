
import { getResizedImageUrl } from "./utils.js";

// --- MÓDULO DE CARROSSÉIS ---

/**
 * Classe base para carrosséis com botões de navegação.
 */
class Carousel {
  constructor(trackId, prevBtnId, nextBtnId) {
    this.track = document.getElementById(trackId);
    this.prevBtn = document.getElementById(prevBtnId);
    this.nextBtn = document.getElementById(nextBtnId);
    this.currentIndex = 0;
    this.totalItems = 0;
    this.itemsPerView = 3;
  }

  init() {
    if (!this.track || !this.prevBtn || !this.nextBtn) return;

    this.populate();
    this.update();

    this.nextBtn.addEventListener("click", () => this.next());
    this.prevBtn.addEventListener("click", () => this.prev());
    window.addEventListener("resize", () => this.update());
  }

  next() {
    const maxIndex = this.totalItems - this.itemsPerView;
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
      this.update();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.update();
    }
  }

  populate() { throw new Error("O método populate() deve ser implementado."); }
  update() { throw new Error("O método update() deve ser implementado."); }
}

/**
 * Carrossel de Agências Premium.
 */
export class AgencyCarousel extends Carousel {
  constructor(agencies) {
    super("carousel-track", "prev-btn", "next-btn");
    this.agencies = agencies;
  }

  populate() {
    if (!this.track) return;
    const shuffledAgencies = [...this.agencies].sort(() => 0.5 - Math.random());
    this.track.innerHTML = "";
    shuffledAgencies.forEach((agency) => {
      this.track.appendChild(this.createAgencyCard(agency));
    });
    this.totalItems = shuffledAgencies.length;
  }

  createAgencyCard(agency) {
    const slide = document.createElement("div");
    slide.className = "flex-shrink-0 w-full sm:w-1/2 md:w-1/3 px-4 box-border";
    slide.innerHTML = `
      <div class="bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700 h-full flex flex-col transform transition-all duration-300 hover:scale-[1.02] hover:shadow-amber-500/10">
        <a href="public_partner_details.html?id=${agency.id}" class="relative h-48 block">
          <img src="${getResizedImageUrl(agency.image, '400x300') || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="Imagem de ${agency.businessName}" class="w-full h-full object-cover" loading="lazy">
          <div class="absolute top-4 right-4 bg-amber-500 text-slate-900 px-3 py-1 rounded-full text-sm font-bold flex items-center">
            <i class="fas fa-star mr-1 text-xs"></i> ${agency.averageRating || "N/A"}
          </div>
        </a>
        <div class="p-6 flex-grow flex flex-col">
          <div class="flex items-center mb-4">
            <img src="${agency.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.businessName)}&background=0f172a&color=f59e0b`}" alt="Logo de ${agency.businessName}" class="w-16 h-16 rounded-full border-4 border-slate-700 mr-4 object-cover">
            <div>
              <h3 class="text-xl font-bold text-white">${agency.businessName}</h3>
              <p class="text-sm text-slate-400">${agency.city}, ${agency.state}</p>
            </div>
          </div>
          <p class="text-sm text-slate-300 flex-grow"><strong class="text-amber-400">Especialidade:</strong> ${(agency.tags && agency.tags[0]) || agency.category.replace(/_/g, " ")}</p>
          <a href="public_partner_details.html?id=${agency.id}" class="mt-4 text-center bg-slate-700 hover:bg-amber-500 hover:text-slate-900 text-white font-bold py-2 px-4 rounded-lg transition-colors">Ver Detalhes</a>
        </div>
      </div>`;
    return slide;
  }

  update() {
    if (!this.track) return;
    if (window.innerWidth < 640) this.itemsPerView = 1;
    else if (window.innerWidth < 768) this.itemsPerView = 2;
    else this.itemsPerView = 3;

    const maxIndex = this.totalItems - this.itemsPerView;
    this.currentIndex = Math.max(0, Math.min(this.currentIndex, maxIndex));

    const itemWidthPercent = 100 / this.itemsPerView;
    this.track.style.transform = `translateX(-${this.currentIndex * itemWidthPercent}%)`;

    Array.from(this.track.children).forEach((slide) => {
      slide.style.width = `${itemWidthPercent}%`;
    });

    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex >= maxIndex;
  }
}

/**
 * Carrossel de Parceiros Premium (Rolagem Infinita).
 */
export class InfiniteCarousel {
  constructor(trackId, items) {
    this.track = document.getElementById(trackId);
    this.items = items;
  }

  init() {
    if (!this.track) return;
    this.populate();
  }

  populate() {
    if (this.items.length === 0) return;
    const allItems = [...this.items, ...this.items]; // Duplica para efeito contínuo
    this.track.innerHTML = "";
    allItems.forEach((item) => {
      const slide = document.createElement("div");
      slide.className = "flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 px-4 box-border";
      slide.innerHTML = `
        <a href="public_partner_details.html?id=${item.id}" class="block bg-slate-800 rounded-2xl overflow-hidden shadow-lg border border-slate-700 group transition-all duration-300 hover:border-amber-400">
          <img src="${getResizedImageUrl(item.image, '300x200')}" alt="${item.businessName}" class="w-full h-40 object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy">
          <div class="p-4">
            <h4 class="text-md font-bold text-white truncate">${item.businessName}</h4>
            <p class="text-sm text-amber-400 truncate">${(item.category || "").replace(/_/g, " ")}</p>
          </div>
        </a>`;
      this.track.appendChild(slide);
    });
  }
}


/**
 * Carrossel de Depoimentos.
 */
export class TestimonialsCarousel extends Carousel {
  constructor(testimonials) {
    super("testimonials-track", "testimonials-prev-btn", "testimonials-next-btn");
    this.testimonials = testimonials;
  }

  populate() {
    if (!this.track) return;
    this.track.innerHTML = "";
    this.testimonials.forEach((testimonial) => {
      const slide = document.createElement("div");
      slide.className = "flex-shrink-0 w-full px-4 box-border";
      slide.innerHTML = `
        <div class="glass-effect rounded-2xl p-8 text-center h-full">
          <img src="${getResizedImageUrl(testimonial.img, '200x200') || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=0f172a&color=f59e0b`}" alt="${testimonial.name}" class="w-24 h-24 rounded-full mx-auto mb-6 border-4 border-amber-400 object-cover" loading="lazy">
          <p class="text-lg italic text-slate-300 mb-6">"${testimonial.quote}"</p>
          <h4 class="text-xl font-bold text-white">${testimonial.name}</h4>
          <p class="text-sm text-amber-400">${testimonial.role}</p>
        </div>`;
      this.track.appendChild(slide);
    });
    this.totalItems = this.testimonials.length;
  }
  
  update() {
    if (!this.track) return;
    this.itemsPerView = 1; // Sempre 1 por vez para depoimentos
    this.track.style.transform = `translateX(-${this.currentIndex * 100}%)`;
    this.prevBtn.disabled = this.currentIndex === 0;
    this.nextBtn.disabled = this.currentIndex === this.totalItems - 1;
  }
}

/**
 * Inicializa a grade de anunciantes 'Basic'.
 * @param {Array} advertisers - Array de objetos de anunciantes.
 */
export function initAdvertiserGrid(advertisers) {
  const grid = document.getElementById("advertiser-grid");
  if (!grid) return;
  grid.innerHTML = "";
  advertisers.forEach((ad) => {
    const card = document.createElement("div");
    const isPlus = ad.plan === "plus" || ad.plan === "advance";
    card.className = `bg-slate-800 rounded-2xl overflow-hidden shadow-lg border-2 ${isPlus ? "border-amber-400" : "border-slate-700"} h-full flex flex-col transform transition-all duration-300 hover:scale-[1.02] hover:shadow-amber-500/10`;
    card.innerHTML = `
      <div class="relative h-48">
        <a href="public_partner_details.html?id=${ad.id}">
          <img src="${getResizedImageUrl(ad.image, '400x300') || "https://placehold.co/400x300/1e293b/fcd34d?text=SVA"}" alt="${ad.businessName}" class="w-full h-full object-cover" loading="lazy">
        </a>
        <div class="absolute top-2 left-2 bg-slate-900/70 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">${(ad.category || "").replace(/_/g, " ")}</div>
        ${isPlus ? '<div class="absolute top-2 right-2 bg-amber-400 text-slate-900 px-3 py-1 rounded-full text-xs font-bold flex items-center"><i class="fas fa-star mr-1 text-xs"></i> PLUS</div>' : ""}
      </div>
      <div class="p-5 flex-grow flex flex-col">
        <h3 class="text-xl font-bold text-white">${ad.businessName}</h3>
        <p class="text-sm text-slate-400 mb-4 flex-grow">${ad.city}, ${ad.state}</p>
        <a href="public_partner_details.html?id=${ad.id}" class="mt-auto text-center ${isPlus ? "bg-amber-500 hover:bg-amber-600 text-slate-900" : "bg-slate-700 hover:bg-slate-600 text-white"} font-bold py-2 px-4 rounded-lg transition-colors">Ver Detalhes</a>
      </div>`;
    grid.appendChild(card);
  });
}