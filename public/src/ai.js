import { auth, db, doc, getDoc, httpsCallable, functions } from "./firebase.js";
import { showAlert } from "./ui/alert.js";

/**
 * Inicializa a lógica do construtor de roteiros com IA.
 */
export function initAIRouteBuilder() {
    const generateBtn = document.getElementById("generate-ai-btn");
    const promptInput = document.getElementById("ai-prompt");
    const resultContainer = document.getElementById("ai-result-container");
    const resultText = document.getElementById("ai-result-text");

    if (!generateBtn) return;

    generateBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            showAlert("Por favor, faça login para usar o construtor de roteiros.");
            // Redireciona para o login, mantendo a âncora da seção de IA
            window.location.href = `/pagina_login.html?redirectTo=${encodeURIComponent(window.location.pathname + "#ferramentas")}`;
            return;
        }
        
        // Verifica se o usuário é Viajante Plus
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists() || userDoc.data().role !== 'traveler_plus') {
            showAlert("Esta é uma funcionalidade exclusiva para assinantes do plano Viajante Plus.");
            window.location.href = "/cadastro_viajante_plus.html";
            return;
        }

        const prompt = promptInput.value;
        if (prompt.trim().length < 10) {
            showAlert("Por favor, descreva sua viagem com mais detalhes para um roteiro melhor.");
            return;
        }

        const btnText = document.getElementById("ai-btn-text");
        const btnLoading = document.getElementById("ai-btn-loading");

        btnText.classList.add("hidden");
        btnLoading.classList.remove("hidden");
        btnLoading.classList.add("flex");
        generateBtn.disabled = true;
        
        if(resultContainer) {
            resultContainer.classList.remove("hidden");
            resultText.innerHTML = '<div class="flex justify-center items-center p-8"><div class="modern-spinner"></div><p class="ml-4 text-slate-300">Gerando seu roteiro...</p></div>';
        }

        try {
            const generateRoteiro = httpsCallable(functions, 'generateRoteiro');
            const result = await generateRoteiro({ prompt: prompt });

            if (result.data.roteiroId) {
                 window.open(`/roteiro_publico.html?uid=${user.uid}&id=${result.data.roteiroId}`, '_blank');
                 if(resultText) resultText.innerHTML = '<p class="text-green-400 text-center">Seu roteiro foi gerado em uma nova aba!</p>';
            } else {
                throw new Error("ID do roteiro não foi retornado pela função.");
            }

        } catch (error) {
            console.error("Erro ao gerar roteiro:", error);
            if(resultText) resultText.innerHTML = `<p class="text-red-400 text-center">Ocorreu um erro: ${error.message}</p>`;
            showAlert("Ocorreu um erro ao gerar o roteiro. Tente novamente.");
        } finally {
            btnText.classList.remove("hidden");
            btnLoading.classList.add("hidden");
            generateBtn.disabled = false;
        }
    });
}
