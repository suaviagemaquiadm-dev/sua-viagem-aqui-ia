import { auth, db, functions } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  getIdTokenResult,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { showAlert } from "./ui/alert.js";
import { initApp } from "./app.js";

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    /**
     * Lida com o redirecionamento do usuário após o login bem-sucedido.
     * @param {object} user - O objeto do usuário do Firebase.
     */
    async function handleRedirect(user) {
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirectTo");
        if (redirectTo) {
            window.location.assign(redirectTo);
            return;
        }

        // Lógica de redirecionamento padrão baseada em custom claims
        try {
            const idTokenResult = await getIdTokenResult(user, true); // Força a atualização do token
            const claims = idTokenResult.claims;

            if (claims.admin === true) {
                window.location.assign("/admin.html");
            } else if (claims.role === "advertiser") {
                window.location.assign("/painel_anunciante.html");
            } else {
                window.location.assign("/perfil.html");
            }
        } catch(error) {
            console.error("Erro ao obter claims, redirecionando para perfil padrão:", error);
            window.location.assign("/perfil.html");
        }
    }

    // --- Lógica do formulário de login ---
    const loginForm = document.getElementById("login-form");
    if (!loginForm) return;

    const submitBtn = document.getElementById("submit-btn");
    const submitText = submitBtn.querySelector(".submit-text");
    const submitLoading = submitBtn.querySelector(".submit-loading");

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        submitText.classList.add("hidden");
        submitLoading.classList.remove("hidden");
        submitLoading.classList.add("flex");
        submitBtn.disabled = true;

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password,
            );
            await handleRedirect(userCredential.user);
        } catch (error) {
            console.error("Erro no login:", error.code);
            let friendlyMessage = "Ocorreu um erro ao tentar fazer login. Tente novamente.";
            if (error.code === "auth/invalid-credential") {
                friendlyMessage = "Credenciais inválidas. Verifique seu e-mail e senha.";
            }
            showAlert(friendlyMessage);
        } finally {
            submitText.classList.remove("hidden");
            submitLoading.classList.add("hidden");
            submitLoading.classList.remove("flex");
            submitBtn.disabled = false;
        }
    });

    // --- Lógica de Login com Google ---
    const googleLoginBtn = document.getElementById("google-login-btn");
    googleLoginBtn.addEventListener("click", async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const additionalUserInfo = getAdditionalUserInfo(result);

            if (additionalUserInfo && additionalUserInfo.isNewUser) {
                const userRef = doc(db, "users", user.uid);
                await setDoc(userRef, {
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    role: "traveler",
                    payment_status: "free",
                    createdAt: serverTimestamp(),
                });
                const generateCode = httpsCallable(functions, "generateAndAssignControlCode");
                await generateCode({ userId: user.uid, userType: "vj" }); // vj = viajante
            }

            await handleRedirect(user);
        } catch (error) {
            console.error("Erro no login com Google:", error);
            let friendlyMessage = "Não foi possível fazer login com o Google. Tente novamente.";
            if (error.code === "auth/account-exists-with-different-credential") {
                friendlyMessage = "Já existe uma conta com este e-mail. Tente fazer login com sua senha.";
            }
            showAlert(friendlyMessage);
        }
    });

    // --- Lógica de Recuperação de Senha ---
    const resetModal = document.getElementById("reset-password-modal");
    const forgotPasswordBtn = document.getElementById("forgot-password-btn");
    const closeResetModalBtn = document.getElementById("close-reset-modal-btn");
    const resetForm = document.getElementById("reset-password-form");
    const resetConfirmation = document.getElementById("reset-confirmation");
    const resetInstructions = document.getElementById("reset-instructions");
    const sendResetLinkBtn = document.getElementById("send-reset-link-btn");

    forgotPasswordBtn.addEventListener("click", () => {
        resetModal.classList.remove("hidden");
        resetForm.reset();
        resetConfirmation.classList.add("hidden");
        resetInstructions.classList.remove("hidden");
        resetForm.style.display = "block";
        document.getElementById("reset-email").focus();
    });

    closeResetModalBtn.addEventListener("click", () => {
        resetModal.classList.add("hidden");
    });

    resetForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("reset-email").value;
        const btnText = sendResetLinkBtn.querySelector(".submit-text");
        const btnLoading = sendResetLinkBtn.querySelector(".submit-loading");

        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");
        btnLoading.classList.add("flex");
        sendResetLinkBtn.disabled = true;

        try {
            const sendPasswordReset = httpsCallable(functions, 'sendPasswordResetEmail');
            await sendPasswordReset({ email });
            
            resetInstructions.classList.add("hidden");
            resetForm.style.display = "none";
            resetConfirmation.textContent = "Se existir uma conta com este e-mail, um link para redefinição de senha foi enviado.";
            resetConfirmation.classList.remove("hidden");
        } catch(error) {
            console.error("Erro ao chamar a função de reset:", error);
            // Mostra a mesma mensagem de sucesso para o usuário para não vazar informação
            resetInstructions.classList.add("hidden");
            resetForm.style.display = "none";
            resetConfirmation.textContent = "Se existir uma conta com este e-mail, um link para redefinição de senha foi enviado.";
            resetConfirmation.classList.remove("hidden");
        } finally {
            // Não reativa o botão imediatamente para desencorajar spam
            setTimeout(() => {
                 btnText.classList.remove("hidden");
                 btnLoading.classList.add("hidden");
                 sendResetLinkBtn.disabled = false;
            }, 2000);
        }
    });
});