
import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { showAlert } from "./ui/alert.js";
import { initApp } from "./app.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
  
  const loadingContainer = document.getElementById("loading-container");
  const itinerariesGrid = document.getElementById("itineraries-grid");
  const noItinerariesMessage = document.getElementById(
    "no-itineraries-message",
  );
  const converter = new showdown.Converter();
  let currentUserId = null;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserId = user.uid;
      await loadItineraries(user.uid);
    } else {
      window.location.href = "pagina_login.html";
    }
  });

  async function loadItineraries(userId) {
    try {
      const itinerariesRef = collection(db, "users", userId, "itineraries");
      const q = query(itinerariesRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        loadingContainer.classList.add("hidden");
        noItinerariesMessage.classList.remove("hidden");
        return;
      }

      itinerariesGrid.innerHTML = "";
      querySnapshot.forEach((doc) => {
        const itinerary = { id: doc.id, ...doc.data() };
        const card = createItineraryCard(itinerary);
        itinerariesGrid.appendChild(card);
      });

      loadingContainer.classList.add("hidden");
      itinerariesGrid.classList.remove("hidden");
    } catch (error) {
      console.error("Erro ao carregar roteiros:", error);
      loadingContainer.innerHTML =
        '<p class="text-red-400">Não foi possível carregar seus roteiros.</p>';
    }
  }

  function createItineraryCard(itinerary) {
    const card = document.createElement("div");
    card.className =
      "glass-effect rounded-2xl p-6 flex flex-col justify-between card-hover";
      
    const isPublic = itinerary.public === true;

    card.innerHTML = `
            <div>
                <h3 class="text-xl font-bold text-white truncate">${
                  itinerary.title
                }</h3>
                <p class="text-sm text-slate-400 mt-1">Criado em: ${new Date(
                  itinerary.createdAt?.toDate(),
                ).toLocaleDateString("pt-BR")}</p>
                <p class="text-sm text-slate-300 mt-4 line-clamp-3">${
                  itinerary.prompt
                }</p>
            </div>
            <div class="flex gap-2 mt-6 border-t border-slate-700 pt-4">
                <button class="view-btn flex-grow bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition" aria-label="Ver roteiro ${
                  itinerary.title
                }"><i class="fas fa-eye mr-2"></i>Ver</button>
                <button class="share-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition" aria-label="Compartilhar roteiro ${
                  itinerary.title
                }"><i class="fas fa-share-alt"></i></button>
                 <button class="toggle-privacy-btn ${
                   isPublic
                     ? "bg-blue-600 hover:bg-blue-700"
                     : "bg-slate-600 hover:bg-slate-700"
                 } text-white font-bold py-2 px-4 rounded-lg transition" aria-label="Tornar roteiro ${
      isPublic ? "privado" : "público"
    }">
                    <i class="fas ${isPublic ? "fa-globe-americas" : "fa-lock"}"></i>
                </button>
                <button class="delete-btn bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition" aria-label="Excluir roteiro ${
                  itinerary.title
                }"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;

    card
      .querySelector(".delete-btn")
      .addEventListener("click", async () => {
        if (confirm("Tem certeza que deseja excluir este roteiro?")) {
          try {
            await deleteDoc(
              doc(db, "users", currentUserId, "itineraries", itinerary.id),
            );
            card.remove();
            showAlert("Roteiro excluído com sucesso!");
            if (itinerariesGrid.children.length === 0) {
              itinerariesGrid.classList.add("hidden");
              noItinerariesMessage.classList.remove("hidden");
            }
          } catch (error) {
            console.error("Erro ao excluir:", error);
            showAlert("Não foi possível excluir o roteiro.");
          }
        }
      });

    card.querySelector(".share-btn").addEventListener("click", async () => {
      const itineraryRef = doc(
        db,
        "users",
        currentUserId,
        "itineraries",
        itinerary.id,
      );
      // Garante que o roteiro seja público antes de compartilhar
      if (!itinerary.public) {
        await updateDoc(itineraryRef, { public: true });
        itinerary.public = true;
        // Atualiza o botão de privacidade na UI
        const toggleBtn = card.querySelector(".toggle-privacy-btn");
        toggleBtn.classList.remove('bg-slate-600', 'hover:bg-slate-700');
        toggleBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        toggleBtn.querySelector('i').classList.remove('fa-lock');
        toggleBtn.querySelector('i').classList.add('fa-globe-americas');
      }

      const shareUrl = `${window.location.origin}/roteiro_publico.html?user=${currentUserId}&id=${itinerary.id}`;
      document.getElementById("share-link-input").value = shareUrl;
      document.getElementById("share-modal").classList.remove("hidden");
    });
    
    // Event listener para o novo botão de privacidade
    const togglePrivacyBtn = card.querySelector(".toggle-privacy-btn");
    togglePrivacyBtn.addEventListener("click", async () => {
        togglePrivacyBtn.disabled = true;
        const currentIsPublic = itinerary.public === true;
        const newStatus = !currentIsPublic;
        const itineraryRef = doc(db, "users", currentUserId, "itineraries", itinerary.id);

        try {
            await updateDoc(itineraryRef, { public: newStatus });
            itinerary.public = newStatus;

            const icon = togglePrivacyBtn.querySelector('i');
            if (newStatus) {
                togglePrivacyBtn.classList.remove('bg-slate-600', 'hover:bg-slate-700');
                togglePrivacyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                icon.classList.remove('fa-lock');
                icon.classList.add('fa-globe-americas');
                togglePrivacyBtn.setAttribute('aria-label', 'Tornar roteiro privado');
                showAlert("Roteiro agora é público.");
            } else {
                togglePrivacyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                togglePrivacyBtn.classList.add('bg-slate-600', 'hover:bg-slate-700');
                icon.classList.remove('fa-globe-americas');
                icon.classList.add('fa-lock');
                togglePrivacyBtn.setAttribute('aria-label', 'Tornar roteiro público');
                showAlert("Roteiro agora é privado.");
            }
        } catch (error) {
            console.error("Erro ao alterar privacidade do roteiro:", error);
            showAlert("Não foi possível alterar a privacidade. Tente novamente.");
        } finally {
            togglePrivacyBtn.disabled = false;
        }
    });


    // Funcionalidade do botão "Ver" para abrir o modal
    card.querySelector(".view-btn").addEventListener("click", () => {
      document.getElementById("itinerary-modal-title").textContent =
        itinerary.title;
      const htmlContent = converter.makeHtml(itinerary.itineraryMarkdown);
      document.getElementById("itinerary-modal-body").innerHTML = htmlContent;
      document
        .getElementById("view-itinerary-modal")
        .classList.remove("hidden");
    });

    return card;
  }

  // Lógica do Modal de Compartilhamento
  const shareModal = document.getElementById("share-modal");
  document
    .getElementById("close-share-modal-btn")
    .addEventListener("click", () => shareModal.classList.add("hidden"));
  document.getElementById("copy-link-btn").addEventListener("click", () => {
    const input = document.getElementById("share-link-input");
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
        showAlert("Link copiado para a área de transferência!");
    }).catch(err => {
        console.error('Erro ao copiar o link:', err);
        showAlert("Erro ao copiar. Tente manualmente.");
    });
  });

  // Lógica do Modal de Visualização
  const viewModal = document.getElementById("view-itinerary-modal");
  document
    .getElementById("close-view-modal-btn")
    .addEventListener("click", () => viewModal.classList.add("hidden"));
});
