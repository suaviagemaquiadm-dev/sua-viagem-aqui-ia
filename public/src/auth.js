import {
  onAuthStateChanged,
  signOut,
  auth,
  db,
  doc,
  getDoc,
  getIdTokenResult,
} from "./firebase.js";
import { getWithTTL, setWithTTL } from "./cache.js";

const USER_ROLES = {
  ADVERTISER: "advertiser",
};

/**
 * Renderiza o cabeçalho do usuário com base nos dados fornecidos.
 * @param {object} userData - Dados do usuário (pode vir do cache ou do Firestore).
 * @param {string} cacheKey - A chave usada para armazenar o perfil do usuário no cache.
 */
function renderUserHeader(userData, cacheKey) {
  const userActions = document.getElementById("user-actions");
  if (!userActions) return;

  const userPhoto = userData.photoURL;
  const userName = userData.name || userData.businessName || "Usuário";
  const userInitial = userName.charAt(0).toUpperCase();
  const avatar = userPhoto
    ? `<img src="${userPhoto}" alt="Foto de Perfil" class="w-8 h-8 rounded-full object-cover">`
    : `<div class="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">${userInitial}</div>`;

  const dashboardLink =
    userData.role === USER_ROLES.ADVERTISER
      ? "/painel_anunciante.html"
      : "/perfil.html";
  const adminDashboardLink = userData.isAdmin
    ? `<a href="/admin.html" class="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-500 transition-all" title="Painel Admin"><i class="fas fa-user-shield"></i><span class="hidden sm:inline font-bold">Admin</span></a>`
    : "";
  
  const notificationContainerHTML = `
    <div id="notification-container" class="relative ${userData.role !== USER_ROLES.ADVERTISER ? '' : 'hidden'}">
      <button id="notification-btn" class="text-white px-3 py-2 rounded-full hover:bg-slate-800 transition-all" aria-label="Ver notificações">
        <i class="fas fa-bell text-lg"></i>
        <span id="notification-badge" class="hidden absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
      </button>
      <div id="notification-panel" class="hidden absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
        <!-- Conteúdo das notificações será populado via JS -->
      </div>
    </div>`;


  userActions.innerHTML = `
    ${notificationContainerHTML}
    ${adminDashboardLink}
    <a href="${dashboardLink}" class="flex items-center gap-2 bg-slate-700 text-amber-400 px-3 py-1 rounded-full hover:bg-slate-600 transition-all" title="Meu Painel">${avatar}<span class="hidden sm:inline font-bold">Meu Painel</span></a>
    <button id="logout-btn-header" class="flex items-center bg-red-600 text-white px-3 py-2 rounded-full hover:bg-red-700 transition-all" title="Sair"><i class="fas fa-sign-out-alt text-lg"></i></button>
    `;

  document.getElementById("logout-btn-header").addEventListener("click", () => {
    localStorage.removeItem(cacheKey);
    signOut(auth);
  });

  // Adiciona lógica para o painel de notificações
  const notificationBtn = document.getElementById('notification-btn');
  const notificationPanel = document.getElementById('notification-panel');
  if (notificationBtn && notificationPanel) {
      notificationBtn.addEventListener('click', () => {
          notificationPanel.classList.toggle('hidden');
      });
  }
}

/**
 * Inicializa o cabeçalho, gerenciando o estado de autenticação do usuário.
 */
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    const userActions = document.getElementById("user-actions");
    if (!userActions) return;

    if (user) {
      const cacheKey = `userProfile_${user.uid}`;
      const cachedUser = getWithTTL(cacheKey);

      try {
        if (cachedUser) {
          renderUserHeader(cachedUser, cacheKey);
        }
      } catch (error) {
        console.error("Falha ao renderizar com cache. Limpando cache corrompido.", error);
        localStorage.removeItem(cacheKey);
      }

      try {
        let userDocSnap;
        let userData;
        let userRole;
        
        // Determina a coleção correta com base no custom claim
        const idTokenResult = await getIdTokenResult(user);
        const claims = idTokenResult.claims;
        userRole = claims.role;

        const collectionName = userRole === USER_ROLES.ADVERTISER ? 'partners' : 'users';
        userDocSnap = await getDoc(doc(db, collectionName, user.uid));
        
        if (userDocSnap && userDocSnap.exists()) {
          userData = userDocSnap.data();
          userData.isAdmin = claims.admin === true;
          userData.role = userRole;

          setWithTTL(cacheKey, userData, 3600000); // Cache por 1 hora

          if (!cachedUser || JSON.stringify(cachedUser) !== JSON.stringify(userData)) {
            renderUserHeader(userData, cacheKey);
          }
        } else {
            console.warn("Documento de perfil não encontrado para o usuário:", user.uid);
            signOut(auth); // Desloga o usuário se não encontrar o perfil correspondente ao seu role
        }
      } catch (error) {
        console.error("Erro ao buscar perfil do usuário no Firestore:", error);
      }
    } else {
      userActions.innerHTML = `<a href="/cadastro_anunciantes.html" class="hidden md:flex items-center bg-transparent border border-cyan-400 text-cyan-400 px-4 py-2 rounded-full hover:bg-cyan-400 hover:text-slate-900 transition-all"><i class="fas fa-bullhorn mr-2"></i><span class="font-bold">Anuncie</span></a><a href="/pagina_login.html" class="flex items-center bg-amber-500 text-slate-900 px-4 py-2 rounded-full hover:bg-amber-400 transition-all"><i class="fas fa-sign-in-alt text-lg mr-2"></i><span class="hidden sm:inline font-bold">Login</span></a>`;
    }
  });
}