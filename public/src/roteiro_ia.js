import { auth, db, functions } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { showAlert } from "./ui/alert.js";
import { initApp } from "./app.js";

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const loadingContainer = document.getElementById("loading-container");
    const plusContent = document.getElementById("plus-content");
    const upgradeMessage = document.getElementById("upgrade-message");
    const aiForm = document.getElementById("ai-form");
    const generateBtn = document.getElementById("generate-btn");
    const itineraryContainer = document.getElementById("itinerary-container");
    const itineraryResult = document.getElementById("itinerary-result");
    const saveItineraryBtn = document.getElementById("save-itinerary-btn");

    if (!aiForm) return;

    const converter = new showdown.Converter();
    let currentUserId = null;
    let lastGeneratedItinerary = null;
    let lastDestination = null;
    let lastPrompt = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    if (userData.role === "traveler_plus") {
                        loadingContainer.classList.add("hidden");
                        plusContent.classList.remove("hidden");
                    } else if (userData.role === "traveler") {
                        loadingContainer.classList.add("hidden");
                        upgradeMessage.classList.remove("hidden");
                    } else { // Advertiser or other roles
                        window.location.href = "painel_anunciante.html";
                    }
                } else { // Document doesn't exist, likely an error state
                    throw new Error("User document not found.");
                }
            } catch (error) {
                console.error("Error verifying user role:", error);
                window.location.href = "pagina_login.html";
            }
        } else {
            window.location.href = `pagina_login.html?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        }
    });

    aiForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const destination = document.getElementById("ai-destination").value;
        const prompt = document.getElementById("ai-prompt").value;

        lastDestination = destination;
        lastPrompt = prompt;

        if (!prompt.trim() || !destination.trim()) {
            showAlert("Por favor, preencha o destino e descreva sua viagem.");
            return;
        }

        toggleButtonLoading(generateBtn, true);
        itineraryContainer.classList.remove("hidden");
        itineraryResult.innerHTML = '<div class="flex items-center justify-center p-8"><div class="modern-spinner"></div><p class="ml-4 text-slate-300">Gerando seu roteiro... Isso pode levar um minuto.</p></div>';
        saveItineraryBtn.classList.add("hidden");

        try {
            const generateItinerary = httpsCallable(functions, "generateItinerary");
            const result = await generateItinerary({
                prompt: `Destino: ${destination}. Detalhes: ${prompt}`,
            });

            if (result.data.success) {
                const markdownText = result.data.itinerary;
                lastGeneratedItinerary = markdownText; // Salva o markdown para uso posterior
                const html = converter.makeHtml(markdownText);
                itineraryResult.innerHTML = html;
                saveItineraryBtn.classList.remove("hidden");
            } else {
                throw new Error(result.data.error || "A IA não conseguiu gerar um roteiro.");
            }
        } catch (error) {
            console.error("Erro ao gerar roteiro:", error);
            itineraryResult.innerHTML = `<p class="text-red-400">Ocorreu um erro ao gerar seu roteiro. Tente novamente mais tarde.</p>`;
        } finally {
            toggleButtonLoading(generateBtn, false);
        }
    });

    saveItineraryBtn.addEventListener("click", async () => {
        if (!lastGeneratedItinerary || !currentUserId) {
            showAlert("Nenhum roteiro para salvar.");
            return;
        }

        saveItineraryBtn.disabled = true;
        saveItineraryBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Salvando...';

        try {
            const itinerariesRef = collection(db, "users", currentUserId, "itineraries");
            await addDoc(itinerariesRef, {
                title: `Roteiro para ${lastDestination}`,
                prompt: lastPrompt,
                destination: lastDestination,
                itineraryMarkdown: lastGeneratedItinerary,
                createdAt: serverTimestamp(),
                public: false // Roteiros são privados por padrão
            });
            showAlert("Roteiro salvo com sucesso em 'Meus Roteiros'!");
        } catch (error) {
            console.error("Erro ao salvar roteiro:", error);
            showAlert("Não foi possível salvar o roteiro.");
        } finally {
            saveItineraryBtn.disabled = false;
            saveItineraryBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Salvar Roteiro';
        }
    });

    // --- Funções Utilitárias ---
    const alertModal = document.getElementById("alert-modal");
    const alertMessage = document.getElementById("alert-message");
    document.getElementById("alert-close-btn").onclick = () => alertModal.classList.add("hidden");
    function showAlert(message) {
        alertMessage.textContent = message;
        alertModal.classList.remove("hidden");
    }

    function toggleButtonLoading(button, isLoading) {
        button.disabled = isLoading;
        const text = button.querySelector(".submit-text");
        const loading = button.querySelector(".submit-loading");
        if (isLoading) {
            text.classList.add("hidden");
            loading.classList.remove("hidden");
            loading.classList.add("flex");
        } else {
            text.classList.remove("hidden");
            loading.classList.add("hidden");
            loading.classList.remove("flex");
        }
    }
});