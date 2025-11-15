import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  httpsCallable,
  functions,
  createUserWithEmailAndPassword,
} from "./firebase.js";
import { createCheckout } from "./payment.js";
import { showAlert } from "./ui/alert.js";

document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.getElementById("form-container");
  const successContainer = document.getElementById("success-container");
  const travelerPlusForm = document.getElementById("traveler-plus-form");
  const formMessage = document.getElementById("form-message");
  const submitBtn = document.getElementById("submit-btn");
  const submitText = document.getElementById("submit-text");
  const submitLoading = document.getElementById("submit-loading");
  const controlCodeDisplay = document.getElementById("control-code-display");

  if (!travelerPlusForm) return;

  travelerPlusForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");
    submitLoading.classList.add('flex');
    submitBtn.disabled = true;
    formMessage.classList.add('hidden');

    const email = travelerPlusForm.email.value;
    const password = travelerPlusForm.password.value;
    
    if (!travelerPlusForm.checkValidity()) {
        showAlert("Por favor, preencha todos os campos obrigatórios.");
        submitBtn.disabled = false;
        submitText.classList.remove("hidden");
        submitLoading.classList.add("hidden");
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const generateCode = httpsCallable(functions, "generateAndAssignControlCode");
      const codeResult = await generateCode({ userId: user.uid, userType: 'vj' }); // vj = viajante
      const controlCode = codeResult.data.controlCode;

      await setDoc(doc(db, "users", user.uid), {
        name: travelerPlusForm.name.value,
        dob: travelerPlusForm.dob.value,
        gender: travelerPlusForm.gender.value,
        cpf: travelerPlusForm.cpf.value,
        city: travelerPlusForm.city.value,
        state: travelerPlusForm.state.value,
        telegram: travelerPlusForm.telegram.value || null,
        email: email,
        role: "traveler_plus",
        payment_status: "pending",
        controlCode: controlCode,
        createdAt: serverTimestamp(),
      });

      formContainer.classList.add("hidden");
      successContainer.classList.remove("hidden");
      controlCodeDisplay.textContent = controlCode;

      await createCheckout(
        "Assinatura Viajante Plus",
        9.99,
        user.uid,
        email,
        "user_subscription",
      );

    } catch (error) {
        console.error("Erro no registo Plus:", error);
        let friendlyMessage = "Ocorreu um erro. Tente novamente.";
        if (error.code === "auth/email-already-in-use") {
            friendlyMessage = "Este email já está em uso. Tente fazer login ou use outro email.";
        } else if (error.code === "auth/weak-password") {
            friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
        }
        showAlert(friendlyMessage);
    } finally {
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
      submitLoading.classList.remove('flex');
      submitBtn.disabled = false;
    }
  });
});