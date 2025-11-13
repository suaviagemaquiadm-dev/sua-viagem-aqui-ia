import {
  onAuthStateChanged,
  signOut,
  auth,
  db,
  doc,
  getDoc,
  getIdTokenResult,
  onSnapshot,
  collection,
  query,
  orderBy,
} from "./firebase.js";
import { getWithTTL, setWithTTL } from "./cache.js";
import { callFunction } from "./apiService.js";
import { updateUserActions } from "./components/Header.js";

/**
 * Initializes the notification system for a logged-in user.
 * @param {string} userId The UID of the current user.
 */
function initNotifications(userId) {
  const notificationBtn = document.getElementById('notification-btn');
  const notificationPanel = document.getElementById('notification-panel');
  const notificationBadge = document.getElementById('notification-badge');

  if (!notificationBtn || !notificationPanel || !notificationBadge) return;
  
  const notificationsRef = collection(db, 'users', userId, 'notifications');
  const q = query(notificationsRef, orderBy('createdAt', 'desc'));

  onSnapshot(q, (snapshot) => {
    let unreadCount = 0;
    if (snapshot.empty) {
      notificationPanel.innerHTML = '<p class="text-slate-400 text-center p-4">Nenhuma notificação.</p>';
      notificationBadge.classList.add('hidden');
      return;
    }

    notificationPanel.innerHTML = ''; // Clear old notifications
    snapshot.forEach(doc => {
      const notification = doc.data();
      if (!notification.read) {
        unreadCount++;
      }
      const notifElement = document.createElement('a');
      notifElement.href = notification.link || '#';
      notifElement.className = `block p-3 hover:bg-slate-700 border-b border-slate-700 ${!notification.read ? 'bg-slate-700/50' : ''}`;
      notifElement.innerHTML = `
        <p class="text-sm text-white">${notification.message}</p>
        <p class="text-xs text-slate-400 mt-1">${new Date(notification.createdAt.toDate()).toLocaleString('pt-BR')}</p>
      `;
      notificationPanel.appendChild(notifElement);
    });

    if (unreadCount > 0) {
      notificationBadge.classList.remove('hidden');
      notificationBadge.classList.add('active'); // Para o CSS
    } else {
      notificationBadge.classList.add('hidden');
      notificationBadge.classList.remove('active');
    }
  }, (error) => {
    console.error("Erro ao ouvir notificações:", error);
  });

  // Attach event listener for marking notifications as read
  notificationBtn.addEventListener('click', () => {
      const isHidden = notificationPanel.classList.toggle('hidden');
      if (!isHidden && notificationBadge.classList.contains('active')) {
          callFunction('markNotificationsAsRead').catch(err => console.error("Falha ao marcar notificações como lidas", err));
      }
  });
}

/**
 * Inicializa o cabeçalho, gerenciando o estado de autenticação do usuário.
 */
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const cacheKey = `userProfile_${user.uid}`;
      const cachedUser = getWithTTL(cacheKey);

      const handleLogout = () => {
        localStorage.removeItem(cacheKey);
        signOut(auth);
      };

      if (cachedUser) {
        updateUserActions(cachedUser, handleLogout);
      }

      try {
        const idTokenResult = await getIdTokenResult(user);
        const claims = idTokenResult.claims;
        const userRole = claims.role;

        const collectionName = userRole === "advertiser" ? 'partners' : 'users';
        const userDocSnap = await getDoc(doc(db, collectionName, user.uid));
        
        if (userDocSnap && userDocSnap.exists()) {
          const userData = userDocSnap.data();
          userData.isAdmin = claims.admin === true;
          userData.role = userRole;

          setWithTTL(cacheKey, userData, 3600000); // Cache por 1 hora

          if (!cachedUser || JSON.stringify(cachedUser) !== JSON.stringify(userData)) {
            updateUserActions(userData, handleLogout);
          }
          
          if (userData.role !== "advertiser") {
              initNotifications(user.uid);
          }
        } else {
            console.warn("User profile document not found for:", user.uid);
            signOut(auth);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    } else {
      updateUserActions(null);
    }
  });
}
