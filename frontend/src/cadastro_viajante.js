import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
} from "./firebase.js";
import { showAlert } from "./ui/alert.js";
import { initApp } from "./app.js";
import { setupRealtimeEmailCheck } from "./form-utils.js";
import { callFunction } from "./apiService.js";

document.addEventListener("DOMContentLoaded", () => {
    initApp();

    const registerForm = document.getElementById("register-form");
    if (!registerForm) return;

    setupRealtimeEmailCheck("email");

    const submitBtn = document.getElementById("submit-btn");
    const submitText = submitBtn.querySelector(".submit-text");
    const submitLoading = submitBtn.querySelector(".submit-loading");

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const password = registerForm.password.value;
        const confirmPassword = registerForm["confirm-password"].value;

        if (password !== confirmPassword) {
            showAlert("As senhas não coincidem.");
            return;
        }

        submitText.classList.add("hidden");
        submitLoading.classList.remove("hidden");
        submitLoading.classList.add("flex");
        submitBtn.disabled = true;

        const name = registerForm.name.value;
        const email = registerForm.email.value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await callFunction("generateAndAssignControlCode", { userId: user.uid, userType: 'vj' });

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                role: "traveler",
                payment_status: "free",
                createdAt: serverTimestamp(),
            });

            // Redireciona para o perfil após o sucesso
            window.location.assign("/perfil.html");

        } catch (error) {
            console.error("Erro no cadastro:", error);
            let friendlyMessage = "Ocorreu um erro ao criar a conta. Tente novamente.";
            if (error.code === "auth/email-already-in-use") {
                friendlyMessage = "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.";
            } else if (error.code === "auth/weak-password") {
                friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
            }
            showAlert(friendlyMessage);
        } finally {
            submitText.classList.remove("hidden");
            submitLoading.classList.add("hidden");
            submitLoading.classList.remove("flex");
            submitBtn.disabled = false;
        }
    });
});
