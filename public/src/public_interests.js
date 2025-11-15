import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const loadingState = document.getElementById("loading-state");
  const contentState = document.getElementById("content-state");
  const userNameEl = document.getElementById("user-name");
  const interestsListEl = document.getElementById("interests-list");

  const params = new URLSearchParams(window.location.search);
  const userId = params.get("id");

  if (!userId) {
    loadingState.innerHTML = '<p class="text-red-400">ID de usuário não fornecido.</p>';
    return;
  }

  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const user = docSnap.data();
      userNameEl.textContent = user.name || "Viajante";
      document.title = `Interesses de ${user.name || "Viajante"} - Sua Viagem Aqui`;

      const interests = user.interests || [];
      if (interests.length > 0) {
        interestsListEl.innerHTML = interests
          .map(
            (interest) =>
              `<span class="tag-item"><i class="fas fa-tag fa-xs"></i>${interest}</span>`,
          )
          .join("");
      } else {
        interestsListEl.innerHTML =
          '<p class="text-slate-400">Este viajante ainda não adicionou interesses.</p>';
      }
    } else {
      userNameEl.textContent = "Usuário não encontrado";
      interestsListEl.innerHTML =
        '<p class="text-red-400">Não foi possível encontrar este perfil.</p>';
    }
  } catch (error) {
    console.error("Erro ao buscar interesses:", error);
    userNameEl.textContent = "Erro";
    interestsListEl.innerHTML =
      '<p class="text-red-400">Ocorreu um erro ao carregar os interesses.</p>';
  } finally {
    loadingState.classList.add("hidden");
    contentState.classList.remove("hidden");
  }
});