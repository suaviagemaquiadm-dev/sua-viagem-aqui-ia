import {
  auth,
  db,
  doc,
  setDoc,
  serverTimestamp,
  createUserWithEmailAndPassword,
} from "./firebase.js";
import { createCheckout } from "./payment.js";
import { showAlert } from "./ui/alert.js";
import { setupRealtimeEmailCheck } from "./form-utils.js";
import { callFunction } from "./apiService.js";

document.addEventListener("DOMContentLoaded", () => {
  const formContainer = document.getElementById("form-container");
  const successContainer = document.getElementById("success-container");
  const partnerForm = document.getElementById("partner-form");
  const formMessage = document.getElementById("form-message");
  const submitBtn = document.getElementById("submit-btn");
  const controlCodeDisplay = document.getElementById("control-code-display");
  const paymentContainer = document.getElementById("payment-container");

  if (!partnerForm) return;
  
  // Aplica máscaras aos campos
  IMask(document.getElementById('cnpj'), { mask: '00.000.000/0000-00' });
  IMask(document.getElementById('whatsapp'), { mask: '(00) 00000-0000' });
  setupRealtimeEmailCheck("email");

  partnerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitText = document.getElementById("submit-text");
    const submitLoading = document.getElementById("submit-loading");
    
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");
    submitBtn.disabled = true;
    formMessage.textContent = "";
    formMessage.className = "hidden text-center p-3 rounded-md mt-6 text-sm";


    const password = partnerForm.password.value;
    const confirmPassword = partnerForm["confirm-password"].value;

    if (password !== confirmPassword) {
      formMessage.textContent = "As senhas não coincidem.";
      formMessage.classList.add("bg-red-500/20", "text-red-400");
      formMessage.classList.remove("hidden");
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
      submitBtn.disabled = false;
      return;
    }

    const email = partnerForm.email.value;
    const plan = partnerForm.plan.value;
    const formData = {
        businessName: partnerForm.businessName.value,
        ownerName: partnerForm.ownerName.value,
        cnpj: partnerForm.cnpj.value,
        whatsapp: partnerForm.whatsapp.value,
        city: partnerForm.city.value,
        state: partnerForm.state.value,
        category: partnerForm.category.value,
        image: partnerForm.image.value || null,
        plan: plan,
        email: email,
    };
    
    try {
        // 1. Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Gerar código de controle via Cloud Function centralizada
        const codeResult = await callFunction("generateAndAssignControlCode", { userId: user.uid, userType: 'an' }); // an = anunciante
        const controlCode = codeResult.controlCode;

        // 3. Salvar dados no Firestore
        await setDoc(doc(db, "partners", user.uid), {
            ...formData,
            uid: user.uid,
            controlCode: controlCode,
            status: plan === "free" ? "aguardando_aprovacao" : "aguardando_pagamento",
            payment_status: plan === "free" ? "n/a" : "pending",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        
        // 4. Atualizar UI
        formContainer.classList.add("hidden");
        successContainer.classList.remove("hidden");
        controlCodeDisplay.textContent = controlCode;

        // 5. Iniciar fluxo de pagamento se não for plano gratuito
        if (plan !== "free") {
            paymentContainer.classList.remove("hidden");
            const plans = {
                basic: { name: "Plano Basic", price: 99.00 },
                plus: { name: "Plano Plus", price: 199.00 },
                advance: { name: "Plano Advance", price: 399.00 }
            };
            const selectedPlan = plans[plan];
            await createCheckout(selectedPlan.name, selectedPlan.price, user.uid, email, "partner_subscription");
        } else {
            successContainer.querySelector("#payment-container").innerHTML = "<p class='text-green-400'>Seu cadastro no plano gratuito foi enviado para aprovação.</p>"
            successContainer.querySelector("#payment-container").classList.remove('hidden');
        }

    } catch (error) {
        console.error("Erro no cadastro do parceiro:", error);
        let friendlyMessage = "Ocorreu um erro. Tente novamente.";
        if (error.code === "auth/email-already-in-use") {
            friendlyMessage = "Este e-mail já está em uso. Tente fazer login ou use outro e-mail.";
        } else if (error.code === "auth/weak-password") {
            friendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
        }
        formMessage.textContent = friendlyMessage;
        formMessage.classList.add("bg-red-500/20", "text-red-400");
        formMessage.classList.remove("hidden");
    } finally {
        submitText.classList.remove("hidden");
        submitLoading.classList.add("hidden");
        submitBtn.disabled = false;
    }
  });

  // Popula o select de categorias
  const categorySelect = document.getElementById("category");
  const categories = {
      "agencias": "Agências de Viagens",
      "aluguel": "Aluguel de Carros, Motos e Bicicletas",
      "bares": "Bares e Vida Noturna",
      "camping": "Camping",
      "ecoturismo": "Ecoturismo e Aventura",
      "experiencias": "Experiências Culturais",
      "familia": "Viagens em Família",
      "fotografos": "Fotógrafos de Viagem",
      "guias": "Guias de Turismo",
      "hospedagem": "Hotéis e Pousadas",
      "mergulho": "Mergulho",
      "passeios_barco": "Passeios de Barco / Lancha",
      "pet_friendly": "Pet Friendly",
      "restaurantes": "Restaurantes",
      "transfer": "Transfer e Receptivo",
      "turismo_rural": "Turismo Rural"
  };
  categorySelect.innerHTML = '<option value="" disabled selected>Selecione uma categoria</option>';
  for (const key in categories) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = categories[key];
      categorySelect.appendChild(option);
  }
});
