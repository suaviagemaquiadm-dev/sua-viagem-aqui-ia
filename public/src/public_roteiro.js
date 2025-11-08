import { db, doc, getDoc } from "./firebase.js";
import { initApp } from "./app.js";

document.addEventListener("DOMContentLoaded", async () => {
  initApp(); // Loads header and handles auth state for potential logged-in user viewing

  const loadingState = document.getElementById("loading-state");
  const contentState = document.getElementById("roteiro-content");
  const titleEl = document.getElementById("roteiro-title");
  const bodyEl = document.getElementById("roteiro-body");
  const printBtn = document.getElementById("print-btn");
  const authorInfoEl = document.getElementById("author-info");

  const params = new URLSearchParams(window.location.search);
  const userId = params.get("user"); // Corrected param name from 'uid' to 'user'
  const roteiroId = params.get("id");

  if (!userId || !roteiroId) {
    loadingState.innerHTML =
      '<p class="text-red-400 text-center">Informações insuficientes para carregar o roteiro.</p>';
    return;
  }

  try {
    const roteiroRef = doc(db, "users", userId, "itineraries", roteiroId);
    const docSnap = await getDoc(roteiroRef);

    if (docSnap.exists() && docSnap.data().public === true) {
      const roteiro = docSnap.data();

      const authorRef = doc(db, "users", userId);
      const authorSnap = await getDoc(authorRef);
      const authorData = authorSnap.exists() ? authorSnap.data() : null;

      document.title = `${roteiro.title} - Sua Viagem Aqui`;
      titleEl.textContent = roteiro.title;

      if (authorData && authorInfoEl) {
        authorInfoEl.innerHTML = `
            <a href="perfil_publico.html?id=${userId}" class="flex items-center gap-4 group">
                <img src="${
                  authorData.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    authorData.name,
                  )}&background=1f2937&color=fcd34d`
                }" alt="Foto de ${
                  authorData.name
                }" class="w-12 h-12 rounded-full object-cover border-2 border-transparent group-hover:border-amber-400 transition-all">
                <div>
                    <p class="text-sm text-slate-400">Roteiro criado por:</p>
                    <span class="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">${
                      authorData.name
                    }</span>
                </div>
            </a>
        `;
      }

      // Use marked and DOMPurify safely
      if (window.marked && window.DOMPurify) {
        const rawHtml = window.marked.parse(roteiro.itineraryMarkdown);
        bodyEl.innerHTML = window.DOMPurify.sanitize(rawHtml);
      } else {
        console.error("Marked or DOMPurify not loaded.");
        bodyEl.textContent = roteiro.itineraryMarkdown; // Fallback to plain text
      }

      loadingState.classList.add("hidden");
      contentState.classList.remove("hidden");

      if(printBtn) {
        printBtn.addEventListener("click", () => window.print());
      }

    } else {
      loadingState.innerHTML =
        '<p class="text-red-400 text-center">Roteiro não encontrado ou é privado.</p>';
    }
  } catch (error) {
    console.error("Erro ao buscar roteiro:", error);
    loadingState.innerHTML =
      '<p class="text-red-400 text-center">Ocorreu um erro ao carregar o roteiro.</p>';
  }
});