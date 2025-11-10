import {
  db,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  auth,
  onAuthStateChanged,
  collection,
  query,
  orderBy,
  getDocs,
  httpsCallable,
  functions,
} from "./firebase.js";
import { initApp } from "./app.js";
import { getResizedImageUrl } from "./utils.js";
import { showAlert } from "./ui/alert.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp(); // Loads header, footer, auth state

  const container = document.getElementById("ad-details-container");
  const loadingState = document.getElementById("loading-state");
  const reviewsSection = document.getElementById("reviews-section");

  const urlParams = new URLSearchParams(window.location.search);
  const partnerId = urlParams.get("id");
  let currentUser = null;
  let isFavorited = false; // Add state to track favorite status

  // Listen for auth state changes to update UI dynamically
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (partnerId) {
      loadPartnerDetails(partnerId);
    }
  });

  if (!partnerId) {
    loadingState.innerHTML =
      '<p class="text-red-400 text-center text-lg">ID do parceiro não fornecido. Não é possível carregar os detalhes.</p>';
    return;
  }

  async function loadPartnerDetails(id) {
    try {
      const partnerRef = doc(db, "partners", id);
      const docSnap = await getDoc(partnerRef);

      if (docSnap.exists()) {
        const partner = { id: docSnap.id, ...docSnap.data() };
        document.title = `${partner.businessName} - Sua Viagem Aqui`;
        await renderPartnerDetails(partner);
        await loadAndRenderReviews(partner.id); // Carrega as avaliações
        loadingState.classList.add("hidden");
        reviewsSection.classList.remove("hidden");
      } else {
        loadingState.innerHTML =
          '<p class="text-red-400 text-center text-lg">Parceiro não encontrado.</p>';
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes do parceiro:", error);
      loadingState.innerHTML =
        '<p class="text-red-400 text-center text-lg">Ocorreu um erro ao carregar os detalhes. Tente novamente.</p>';
    }
  }

  async function renderPartnerDetails(partner) {
    const tagsHtml = (partner.tags || [])
      .map(
        (tag) =>
          `<span class="bg-slate-700 text-amber-400 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${tag}</span>`,
      )
      .join("");

    const verifiedBadge = partner.verified
      ? ' <i class="fas fa-check-circle text-blue-400 text-lg ml-2" title="Parceiro Verificado"></i>'
      : "";

    container.innerHTML = `
      <div class="glass-effect rounded-2xl shadow-2xl overflow-hidden">
        <div class="h-64 md:h-80 bg-cover bg-center" style="background-image: url('${
          getResizedImageUrl(partner.image, "800x600") ||
          "https://placehold.co/800x400/1e293b/fcd34d?text=SVA"
        }')"></div>
        <div class="p-6 md:p-10">
          <div class="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-700 pb-6 mb-6">
            <div>
              <p class="text-amber-400 font-semibold capitalize">${(
                partner.category || ""
              ).replace(/_/g, " ")}</p>
              <h1 class="text-3xl md:text-4xl font-bold text-white flex items-center">${
                partner.businessName
              }${verifiedBadge}</h1>
              <p class="text-slate-400 mt-2"><i class="fas fa-map-marker-alt mr-2"></i>${
                partner.city
              }, ${partner.state}</p>
            </div>
            <div id="favorite-btn-container" class="mt-4 md:mt-0">
                <!-- Botão de favorito será inserido aqui -->
            </div>
          </div>
          
          <div>
            <h2 class="text-2xl font-bold text-white mb-4">Sobre</h2>
            <p class="text-slate-300 whitespace-pre-wrap leading-relaxed">${
              partner.description || "Nenhuma descrição fornecida."
            }</p>
          </div>

          <div class="mt-8">
            <h2 class="text-2xl font-bold text-white mb-4">Tags</h2>
            <div class="flex flex-wrap gap-2">${
              tagsHtml || '<p class="text-slate-400">Nenhuma tag definida.</p>'
            }</div>
          </div>

          <div class="mt-8 pt-8 border-t border-slate-700">
             <h2 class="text-2xl font-bold text-white mb-4">Contato</h2>
             <a href="https://wa.me/55${(partner.whatsapp || "").replace(
               /\D/g,
               "",
             )}" target="_blank" rel="noopener noreferrer" class="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg">
                <i class="fab fa-whatsapp mr-3"></i>Contatar via WhatsApp
             </a>
          </div>
        </div>
      </div>
    `;
    await setupFavoriteButton(partner.id);
  }

  async function loadAndRenderReviews(partnerId) {
    const summaryContainer = document.getElementById("reviews-summary");
    const listContainer = document.getElementById("reviews-list");
    const noReviewsMsg = document.getElementById("no-reviews-message");
    const formContainer = document.getElementById("review-form-container");

    try {
        // Pega os dados agregados do parceiro
        const partnerRef = doc(db, "partners", partnerId);
        const partnerSnap = await getDoc(partnerRef);
        const partnerData = partnerSnap.data();

        const avgRating = partnerData.averageRating || 0;
        const reviewCount = partnerData.reviewCount || 0;
        
        // Renderiza o sumário
        summaryContainer.innerHTML = `
            <span class="text-5xl font-bold text-white">${avgRating.toFixed(1)}</span>
            <div>
                <div class="star-rating text-2xl">${renderStars(avgRating)}</div>
                <p class="text-sm text-slate-400">Baseado em ${reviewCount} avaliações</p>
            </div>
        `;

        // Busca e renderiza as avaliações individuais
        const reviewsQuery = query(collection(db, "partners", partnerId, "reviews"), orderBy("createdAt", "desc"));
        const reviewsSnapshot = await getDocs(reviewsQuery);

        if (reviewsSnapshot.empty) {
            noReviewsMsg.classList.remove("hidden");
            listContainer.innerHTML = '';
        } else {
            noReviewsMsg.classList.add("hidden");
            listContainer.innerHTML = '';
            reviewsSnapshot.forEach(doc => {
                const review = doc.data();
                const reviewCard = createReviewCard(review);
                listContainer.appendChild(reviewCard);
            });
        }
        
        // Configura o formulário de avaliação
        await setupReviewForm(partnerId, reviewsSnapshot.docs.map(d => d.data()));

    } catch (error) {
        console.error("Erro ao carregar avaliações:", error);
        summaryContainer.innerHTML = '<p class="text-red-400">Não foi possível carregar as avaliações.</p>';
    }
}

function createReviewCard(review) {
    const card = document.createElement("div");
    card.className = "review-card flex items-start gap-4";
    const avatar = review.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userName)}&background=1f2937&color=fcd34d`;
    
    card.innerHTML = `
        <img src="${avatar}" alt="Foto de ${review.userName}" class="w-12 h-12 rounded-full object-cover flex-shrink-0">
        <div class="flex-grow">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-white">${review.userName}</h4>
                    <p class="text-xs text-slate-400">${new Date(review.createdAt.toDate()).toLocaleDateString('pt-BR')}</p>
                </div>
                <div class="star-rating">${renderStars(review.rating)}</div>
            </div>
            <p class="text-slate-300 mt-2">${review.comment}</p>
        </div>
    `;
    return card;
}


function renderStars(rating) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            starsHtml += '<i class="fas fa-star"></i>';
        } else if (i - rating < 1) {
            starsHtml += '<i class="fas fa-star-half-alt"></i>';
        } else {
            starsHtml += '<i class="far fa-star"></i>';
        }
    }
    return starsHtml;
}


async function setupReviewForm(partnerId, existingReviews) {
    const formContainer = document.getElementById("review-form-container");
    if (!currentUser || currentUser.uid === partnerId) {
        formContainer.classList.add("hidden");
        return;
    }
    
    const userHasReviewed = existingReviews.some(r => r.userId === currentUser.uid);
    if (userHasReviewed) {
         formContainer.innerHTML = '<p class="text-green-400 text-center">Obrigado! Você já avaliou este parceiro.</p>';
         formContainer.classList.remove("hidden");
         return;
    }
    
    formContainer.classList.remove("hidden");

    const reviewForm = document.getElementById("review-form");
    const stars = document.querySelectorAll("#rating-stars .fa-star");
    const ratingInput = document.getElementById("rating-value");

    stars.forEach(star => {
        star.addEventListener("mouseover", () => {
            resetStars();
            const rating = star.dataset.value;
            highlightStars(rating);
        });
        star.addEventListener("mouseout", () => {
             resetStars();
             if (ratingInput.value) {
                 highlightStars(ratingInput.value, true);
             }
        });
        star.addEventListener("click", () => {
            const rating = star.dataset.value;
            ratingInput.value = rating;
            highlightStars(rating, true);
        });
    });

    function highlightStars(rating, isSelected = false) {
        for (let i = 0; i < rating; i++) {
            stars[i].classList.remove("far");
            stars[i].classList.add("fas");
            if(isSelected) stars[i].classList.add("selected");
        }
    }
    function resetStars() {
        stars.forEach(s => {
            s.classList.remove("fas", "selected");
            s.classList.add("far");
        });
    }

    reviewForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("submit-review-btn");
        const submitText = submitBtn.querySelector('.submit-text');
        const submitLoading = submitBtn.querySelector('.submit-loading');
        
        if (!ratingInput.value) {
            showAlert("Por favor, selecione uma nota de 1 a 5 estrelas.");
            return;
        }

        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            const submitReview = httpsCallable(functions, 'submitReview');
            await submitReview({
                partnerId: partnerId,
                rating: parseInt(ratingInput.value, 10),
                comment: document.getElementById("review-comment").value
            });
            showAlert("Avaliação enviada com sucesso!");
            formContainer.innerHTML = '<p class="text-green-400 text-center">Obrigado pela sua avaliação!</p>';
            loadAndRenderReviews(partnerId); // Recarrega para mostrar a nova avaliação
        } catch (error) {
            console.error("Erro ao enviar avaliação:", error);
            showAlert(`Erro: ${error.message}`);
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });
}

  async function setupFavoriteButton(partnerId) {
    const favBtnContainer = document.getElementById("favorite-btn-container");
    if (!favBtnContainer) return;

    if (!currentUser) {
      favBtnContainer.innerHTML = '';
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists() || userSnap.data().role === 'advertiser') {
        favBtnContainer.innerHTML = ''; // Anunciantes não podem favoritar
        return;
    }
    
    const favorites = userSnap.data().favorites || [];
    isFavorited = favorites.includes(partnerId);

    const favBtn = document.createElement("button");
    favBtn.className = `btn-secondary flex items-center gap-2 transition-colors py-3 px-5`;
    
    const updateBtnState = () => {
        if(isFavorited) {
            favBtn.innerHTML = `<i class="fas fa-heart text-red-500"></i> Salvo como Favorito`;
            favBtn.classList.add('bg-red-500/20', 'text-red-400');
        } else {
            favBtn.innerHTML = `<i class="far fa-heart"></i> Salvar como Favorito`;
            favBtn.classList.remove('bg-red-500/20', 'text-red-400');
        }
    };

    updateBtnState();

    favBtn.addEventListener("click", async () => {
      favBtn.disabled = true;
      isFavorited = !isFavorited; // Optimistic update
      updateBtnState();

      try {
        await updateDoc(userRef, {
          favorites: isFavorited ? arrayUnion(partnerId) : arrayRemove(partnerId),
        });
      } catch (error) {
        console.error("Erro ao atualizar favoritos:", error);
        isFavorited = !isFavorited; // Revert state on error
        updateBtnState();
      } finally {
        favBtn.disabled = false;
      }
    });

    favBtnContainer.innerHTML = '';
    favBtnContainer.appendChild(favBtn);
  }
});