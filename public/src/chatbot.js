
import { httpsCallable, functions, auth } from "./firebase.js";
import { showAlert } from "./ui/alert.js";

let chatHistory = [];
let converter;

/**
 * Salva o histórico do chat no sessionStorage.
 */
function saveHistory() {
    try {
        sessionStorage.setItem("chatHistory", JSON.stringify(chatHistory));
    } catch (error) {
        console.warn("Não foi possível salvar o histórico do chat:", error);
    }
}

/**
 * Carrega o histórico do chat do sessionStorage.
 */
function loadHistory() {
    try {
        const savedHistory = sessionStorage.getItem("chatHistory");
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            const messagesContainer = document.getElementById("chat-messages");
            messagesContainer.innerHTML = ''; // Limpa antes de recarregar
            chatHistory.forEach(msg => addMessageToUI(msg.text, msg.role, false));
        }
    } catch (error) {
        console.warn("Não foi possível carregar o histórico do chat:", error);
        chatHistory = []; // Reseta em caso de erro
    }
}

export function initChatbot() {
    const toggleButton = document.getElementById("chatbot-toggle");
    const widget = document.getElementById("chatbot-widget");
    const closeButton = document.getElementById("chatbot-close");
    const form = document.getElementById("chat-input-form");
    const messagesContainer = document.getElementById("chat-messages");

    if (!toggleButton || !widget || !closeButton || !form) {
        console.warn("Elementos do chatbot não encontrados. O chatbot não será inicializado.");
        return;
    }
    
    if (typeof showdown !== 'undefined') {
        converter = new showdown.Converter();
    } else {
        console.warn("Showdown.js não encontrado. O Markdown não será renderizado no chat.");
    }
    
    // Carrega o histórico da sessão ao inicializar
    loadHistory();

    const toggleWidget = (show) => {
        if (show) {
            widget.classList.remove("hidden");
            toggleButton.classList.add("hidden");
            // Adiciona mensagem de boas-vindas apenas se o chat estiver vazio
            if(chatHistory.length === 0) {
                 setTimeout(() => addMessageToUI("Olá! Como posso te ajudar a planejar sua viagem hoje?", "bot"), 200);
            }
        } else {
            widget.classList.add("hidden");
            toggleButton.classList.remove("hidden");
        }
    };

    toggleButton.addEventListener("click", () => toggleWidget(true));
    closeButton.addEventListener("click", () => toggleWidget(false));

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!auth.currentUser) {
            showAlert("Por favor, faça login para usar o assistente.");
            return;
        }

        const input = document.getElementById("chat-input");
        const message = input.value.trim();

        if (message) {
            addMessageToUI(message, "user");
            input.value = "";
            showLoadingIndicator();
            callChatbotFunction(message);
        }
    });
    
    function addMessageToUI(message, role, shouldSave = true) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("chat-message", `chat-message-${role}`);
        
        let contentHTML;
        if (converter) {
            contentHTML = converter.makeHtml(message);
        } else {
            contentHTML = `<p>${message}</p>`;
        }

        messageDiv.innerHTML = contentHTML;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (role !== 'loading' && shouldSave) {
            chatHistory.push({ role, text: message });
            saveHistory(); // Salva o histórico após adicionar uma nova mensagem
        }
    }
    
    function showLoadingIndicator() {
        const loadingDiv = document.createElement("div");
        loadingDiv.id = "chat-loading";
        loadingDiv.className = "chat-message chat-message-bot";
        loadingDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeLoadingIndicator() {
        const loadingEl = document.getElementById("chat-loading");
        if (loadingEl) {
            loadingEl.remove();
        }
    }

    async function callChatbotFunction(message) {
        try {
            const askChatbot = httpsCallable(functions, "askChatbot");
            // Envia apenas o histórico recente para economizar tokens
            const recentHistory = chatHistory.slice(-10); 
            const result = await askChatbot({ message, history: recentHistory });
            
            removeLoadingIndicator();
            addMessageToUI(result.data.text, "bot");

        } catch (error) {
            console.error("Erro ao chamar a função do chatbot:", error);
            removeLoadingIndicator();
            addMessageToUI("Desculpe, não consegui processar sua pergunta. Tente novamente.", "bot");
        }
    }
}