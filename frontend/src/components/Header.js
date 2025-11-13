export function HeaderComponent() {
  return `
    <div class="container mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <a href="/index.html" class="flex items-center group">
          <svg class="h-10 w-10 mr-3 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 21s-8-4.5-8-11.8A8 8 0 0112 3a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span class="text-2xl font-bold text-white">Sua Viagem <span class="text-amber-400">Aqui</span></span>
        </a>
        <nav class="hidden md:flex items-center space-x-8">
            <a href="/index.html#como-funciona" class="text-slate-300 hover:text-amber-400 transition-colors font-semibold">Como Funciona</a>
            <a href="/index.html#planos" class="text-slate-300 hover:text-amber-400 transition-colors font-semibold">Planos</a>
        </nav>
        <div id="user-actions" class="flex items-center space-x-2 md:space-x-4">
          <!-- User actions will be dynamically inserted here -->
        </div>
      </div>
    </div>
  `;
}

export function updateUserActions(userData, onLogout) {
    const userActionsContainer = document.getElementById('user-actions');
    if (!userActionsContainer) return;

    if (userData) {
        const userPhoto = userData.photoURL;
        const userName = userData.name || userData.businessName || "Usuário";
        const userInitial = userName.charAt(0).toUpperCase();
        const avatar = userPhoto
            ? `<img src="${userPhoto}" alt="Foto de Perfil" class="w-8 h-8 rounded-full object-cover">`
            : `<div class="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">${userInitial}</div>`;

        const dashboardLink = userData.role === "advertiser" ? "/painel_anunciante.html" : "/perfil.html";
        const adminDashboardLink = userData.isAdmin
            ? `<a href="/admin.html" class="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-full hover:bg-indigo-500 transition-all" title="Painel Admin"><i class="fas fa-user-shield"></i><span class="hidden sm:inline font-bold">Admin</span></a>`
            : "";

        const notificationContainerHTML = `
            <div id="notification-container" class="relative ${userData.role === "advertiser" ? 'hidden' : ''}">
              <button id="notification-btn" class="text-white px-3 py-2 rounded-full hover:bg-slate-800 transition-all" aria-label="Ver notificações">
                <i class="fas fa-bell text-lg"></i>
                <span id="notification-badge" class="hidden absolute top-0 right-0 h-3 w-3 bg-red-500 rounded-full border-2 border-slate-900"></span>
              </button>
              <div id="notification-panel" class="hidden absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
                <!-- Notification content will be populated -->
              </div>
            </div>`;
        
        userActionsContainer.innerHTML = `
            ${notificationContainerHTML}
            ${adminDashboardLink}
            <a href="${dashboardLink}" class="flex items-center gap-2 bg-slate-700 text-amber-400 px-3 py-1 rounded-full hover:bg-slate-600 transition-all" title="Meu Painel">${avatar}<span class="hidden sm:inline font-bold">Meu Painel</span></a>
            <button id="logout-btn-header" class="flex items-center bg-red-600 text-white px-3 py-2 rounded-full hover:bg-red-700 transition-all" title="Sair"><i class="fas fa-sign-out-alt text-lg"></i></button>
        `;
        
        document.getElementById("logout-btn-header").addEventListener("click", onLogout);

    } else {
        userActionsContainer.innerHTML = `
          <a href="/cadastro_anunciantes.html" class="hidden md:flex items-center bg-transparent border border-cyan-400 text-cyan-400 px-4 py-2 rounded-full hover:bg-cyan-400 hover:text-slate-900 transition-all">
            <i class="fas fa-bullhorn mr-2"></i>
            <span class="font-bold">Anuncie</span>
          </a>
          <a href="/pagina_login.html" class="flex items-center bg-amber-500 text-slate-900 px-4 py-2 rounded-full hover:bg-amber-400 transition-all">
            <i class="fas fa-sign-in-alt text-lg mr-2"></i>
            <span class="hidden sm:inline font-bold">Login</span>
          </a>
        `;
    }
}
