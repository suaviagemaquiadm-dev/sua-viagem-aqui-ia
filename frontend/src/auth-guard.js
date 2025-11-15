import { auth, onAuthStateChanged, db, doc, getDoc } from "./firebase.js";

/**
 * Protege uma página, redirecionando o usuário se não tiver a permissão necessária.
 * @param {string} requiredRole O papel necessário para acessar a página (ex: 'admin', 'advertiser').
 * @param {function} onAuthorizedCallback Callback a ser executado se o usuário estiver autorizado.
 */
export function protectPage(requiredRole, onAuthorizedCallback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Usuário não logado, redirecionar para a página de login
      window.location.assign(`/pagina_login.html?redirectTo=${window.location.pathname}`);
      return;
    }

    // Usuário logado, verificar o papel
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userRole = userData.role;

        if (userRole === requiredRole) {
          // Usuário autorizado, executar callback
          onAuthorizedCallback();
        } else {
          // Usuário não autorizado, redirecionar para uma página de acesso negado ou perfil
          console.warn(`Acesso negado: Usuário com papel '${userRole}' tentou acessar página de '${requiredRole}'.`);
          window.location.assign("/perfil.html"); // Redirecionar para o perfil padrão
        }
      } else {
        // Documento do usuário não encontrado, redirecionar para login
        console.error("Documento do usuário não encontrado no Firestore.");
        window.location.assign(`/pagina_login.html?redirectTo=${window.location.pathname}`);
      }
    } catch (error) {
      console.error("Erro ao verificar papel do usuário:", error);
      window.location.assign(`/pagina_login.html?redirectTo=${window.location.pathname}`);
    }
  });
}
