import { showAlert } from "/src/ui/alert.js";
import { callFunction } from "./apiService.js";

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById("contact-form");
    if (!contactForm) return;

    const submitBtn = document.getElementById("submit-btn");

    contactForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        const submitText = submitBtn.querySelector(".submit-text");
        const submitLoading = submitBtn.querySelector(".submit-loading");
        
        submitText.classList.add("hidden");
        submitLoading.classList.remove("hidden");
        submitLoading.classList.add("flex");


        const formData = {
            name: document.getElementById("name").value,
            email: document.getElementById("email").value,
            subject: document.getElementById("subject").value,
            message: document.getElementById("message").value,
        };

        try {
            const result = await callFunction("sendContactEmail", formData);

            if (result.success) {
                showAlert("Mensagem enviada com sucesso! Entraremos em contato em breve.");
                contactForm.reset();
            } else {
                throw new Error(result.error || "Erro desconhecido ao enviar e-mail.");
            }
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            // A `callFunction` já exibe um alerta genérico, não precisamos de outro aqui.
        } finally {
            submitBtn.disabled = false;
            submitText.classList.remove("hidden");
            submitLoading.classList.add("hidden");
            submitLoading.classList.remove("flex");
        }
    });
});