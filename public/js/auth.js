import { onAuthStateChanged, signOut, getIdTokenResult } from "./firebase-init.js";
import { auth, db } from './firebase-init.js';
import { doc, getDoc } from "./firebase-init.js";

const userActions = document.getElementById('user-actions');

/**
 * Checks if the current user is an admin.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
export async function checkAdminStatus() {
    const user = auth.currentUser;
    if (user) {
        const idTokenResult = await getIdTokenResult(user);
        return idTokenResult.claims.admin === true;
    }
    return false;
}

/**
 * Protects a page by redirecting unauthorized users.
 * @param {'admin' | 'user' | 'partner'} requiredRole The role required to access the page.
 * @param {Function} onAuthorized A callback function to run if the user is authorized.
 */
export const protectPage = (requiredRole, onAuthorized) => {
    onAuthStateChanged(auth, async (user) => {
        const loadingState = document.getElementById('loading-state');
        const contentState = document.getElementById('content-state');
        const permissionDenied = document.getElementById('permission-denied');

        if (user) {
            try {
                const idTokenResult = await getIdTokenResult(user, true); // Force refresh
                const claims = idTokenResult.claims;
                const isAdmin = claims.admin === true;

                let userRole;
                 if (isAdmin) {
                    userRole = 'admin';
                } else {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    const partnerDoc = await getDoc(doc(db, "partners", user.uid));
                    if (userDoc.exists()) userRole = userDoc.data().role;
                    if (partnerDoc.exists()) userRole = 'partner';
                }

                let isAuthorized = false;
                if (isAdmin) { // Admins can access everything
                    isAuthorized = true;
                } else if (requiredRole === 'user' && (userRole === 'traveler' || userRole === 'traveler_plus')) {
                    isAuthorized = true;
                } else if (requiredRole === 'partner' && userRole === 'partner') {
                    isAuthorized = true;
                }
                
                if (isAuthorized) {
                    loadingState?.classList.add('hidden');
                    contentState?.classList.remove('hidden');
                    onAuthorized(user, claims);
                } else {
                     loadingState?.classList.add('hidden');
                     permissionDenied?.classList.remove('hidden');
                }
            } catch (error) {
                console.error("Authorization Error:", error);
                loadingState?.classList.add('hidden');
                permissionDenied?.classList.remove('hidden');
            }
        } else {
            // Redirect to login if no user is signed in
            window.location.href = '/pagina_login.html';
        }
    });
};


/**
 * Initializes the header with user-specific actions (login, logout, profile).
 */
export const initAuth = () => {
    onAuthStateChanged(auth, async (user) => {
        const userActions = document.getElementById('user-actions');
        if (!userActions) return;

        if (user) {
            const idTokenResult = await getIdTokenResult(user);
            const isAdmin = idTokenResult.claims.admin === true;

            let profileLink = '/perfil.html'; // Default for travelers
            const partnerDoc = await getDoc(doc(db, "partners", user.uid)).catch(() => null);
            if (partnerDoc && partnerDoc.exists()) {
                profileLink = '/painel_anunciante.html';
            }

            let adminButton = '';
            if (isAdmin) {
                adminButton = `
                    <a href="/admin.html" class="flex items-center bg-purple-600 text-white px-3 py-2 rounded-full hover:bg-purple-700 transition-all text-sm font-bold" title="Painel Admin">
                        <i class="fas fa-user-shield"></i>
                        <span class="hidden sm:inline ml-2">Admin</span>
                    </a>`;
            }

            userActions.innerHTML = `
                ${adminButton}
                <a href="${profileLink}" class="flex items-center bg-slate-700 text-white px-3 py-2 rounded-full hover:bg-slate-600 transition-all text-sm font-bold" title="Meu Painel">
                    <i class="fas fa-user-circle"></i>
                    <span class="hidden sm:inline ml-2">Meu Painel</span>
                </a>
                <button id="logout-btn-header" class="flex items-center bg-red-600 text-white px-3 py-2 rounded-full hover:bg-red-700 transition-all text-sm font-bold" title="Sair">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            document.getElementById('logout-btn-header')?.addEventListener('click', () => {
                signOut(auth).catch(console.error);
            });
        } else {
            userActions.innerHTML = `
                <a href="/cadastro_anunciantes.html" class="hidden md:inline-block bg-transparent border border-amber-400 text-amber-400 px-4 py-2 rounded-full hover:bg-amber-400 hover:text-slate-900 transition-all font-bold text-sm">
                    Anuncie Seu Negócio
                </a>
                <a href="/pagina_login.html" class="bg-amber-500 text-slate-900 px-4 py-2 rounded-full hover:bg-amber-400 transition-all font-bold text-sm">
                    Login
                </a>
            `;
        }
    });
};
