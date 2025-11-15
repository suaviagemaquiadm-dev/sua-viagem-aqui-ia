import { auth, db } from "./firebase.js";
import { onAuthStateChanged, getIdTokenResult } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Constantes para evitar 'magic strings'
const USER_ROLES = {
  ADMIN: "admin",
  ADVERTISER: "advertiser",
  TRAVELER: "traveler",
  TRAVELER_PLUS: "traveler_plus"
};

/**
 * Protege uma página, garantindo que apenas utilizadores com a permissão correta possam aceder.
 * @param {'admin' | 'advertiser' | 'traveler'} requiredPermission - O tipo de permissão necessária.
 * @param {function(object, object): void} onAuthorized - Função a ser executada se o utilizador for autorizado. Recebe o objeto 'user' e 'userData'.
 */
export function protectPage(requiredPermission, onAuthorized) {
  const loadingState = document.getElementById("loading-state");
  const contentState = document.getElementById("content-state");
  const permissionDenied = document.getElementById("permission-denied");

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Redireciona para o login se não houver usuário, passando a página atual como destino
      window.location.href = `/pagina_login.html?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    try {
      const idTokenResult = await getIdTokenResult(user, true); // Força a atualização do token
      const claims = idTokenResult.claims;
      const isAdmin = claims.admin === true;
      const userRole = claims.role;

      let hasPermission = false;
      if (isAdmin) { // Admin tem acesso a tudo
          hasPermission = true;
      } else {
          switch (requiredPermission) {
              case USER_ROLES.ADMIN:
                  hasPermission = false; // Já tratado pelo isAdmin
                  break;
              case USER_ROLES.ADVERTISER:
                  hasPermission = userRole === USER_ROLES.ADVERTISER;
                  break;
              case USER_ROLES.TRAVELER:
                  hasPermission = userRole === USER_ROLES.TRAVELER || userRole === USER_ROLES.TRAVELER_PLUS;
                  break;
              default:
                  hasPermission = false;
          }
      }
      
      if (hasPermission) {
        const collectionName = userRole === USER_ROLES.ADVERTISER ? 'partners' : 'users';
        const userDoc = await getDoc(doc(db, collectionName, user.uid));
        
        loadingState?.classList.add("hidden");
        contentState?.classList.remove("hidden");
        onAuthorized(user, userDoc.exists() ? userDoc.data() : null);

      } else {
        console.warn(`Acesso negado para o usuário ${user.uid} à rota '${requiredPermission}'. Role atual: '${userRole}'`);
        loadingState?.classList.add("hidden");
        permissionDenied?.classList.remove("hidden");
      }
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      loadingState?.classList.add("hidden");
      permissionDenied?.classList.remove("hidden");
    }
  });
}