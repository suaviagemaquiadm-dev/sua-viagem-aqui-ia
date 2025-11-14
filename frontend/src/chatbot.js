import { auth } from "./firebase.js";
import { showAlert } from "./ui/alert.js";
import { callFunction } from "./apiService.js";

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
    const suggestionsContainer = document.getElementById("chat-suggestions");

    if (!toggleButton || !widget || !closeButton || !form) {
        console.warn("Elementos do chatbot não encontrados. O chatbot não será inicializado.");
        return;
    }
    
    // As bibliotecas 'showdown' e 'DOMPurify' devem ser carregadas globalmente (ex: no HTML principal via CDN)
    if (typeof showdown !== 'undefined') {
        converter = new showdown.Converter();
    } else {
        console.warn("Showdown.js não encontrado. O Markdown não será renderizado no chat.");
    }
    
    loadHistory();

    const toggleWidget = (show) => {
        if (show) {
            widget.classList.remove("hidden");
            toggleButton.classList.add("hidden");
            if(chatHistory.length === 0) {
                 setTimeout(() => {
                    addMessageToUI("Olá! Sou seu assistente de viagem. Como posso te ajudar hoje?", "bot");
                    renderSuggestions();
                 }, 200);
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
        suggestionsContainer.innerHTML = ""; // Limpa sugestões

        if (message) {
            addMessageToUI(message, "user");
            input.value = "";
            showLoadingIndicator();
            callChatbotFunction(message);
        }
    });

    function renderSuggestions() {
        const suggestions = [
            "Sugira um destino de praia",
            "Como funciona o plano Plus?",
            "Quero anunciar meu negócio"
        ];
        suggestionsContainer.innerHTML = "";
        suggestions.forEach(text => {
            const button = document.createElement("button");
            button.className = "bg-slate-700 text-slate-200 text-sm px-3 py-1 rounded-full hover:bg-slate-600 transition-colors";
            button.textContent = text;
            button.onclick = () => {
                if (!auth.currentUser) {
                    showAlert("Por favor, faça login para usar o assistente.");
                    return;
                }
                addMessageToUI(text, "user");
                suggestionsContainer.innerHTML = ""; // Limpa sugestões após clique
                showLoadingIndicator();
                callChatbotFunction(text);
            };
            suggestionsContainer.appendChild(button);
        });
    }
    
    function addMessageToUI(message, role, shouldSave = true) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("chat-message", `chat-message-${role}`);
        
        let sanitizedHtml;
        if (converter && window.DOMPurify) {
            const rawHtml = converter.makeHtml(message);
            sanitizedHtml = window.DOMPurify.sanitize(rawHtml);
        } else {
            // Fallback seguro para texto puro se as bibliotecas não estiverem disponíveis
            const p = document.createElement('p');
            p.textContent = message;
            sanitizedHtml = p.outerHTML;
        }

        messageDiv.innerHTML = sanitizedHtml;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (role !== 'loading' && shouldSave) {
            chatHistory.push({ role, text: message });
            saveHistory();
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
            const recentHistory = chatHistory.slice(-10); 
            const result = await callFunction("askChatbot", { message, history: recentHistory });
            
            removeLoadingIndicator();
            addMessageToUI(result.text, "bot");

        } catch (error) {
            console.error("Erro ao chamar a função do chatbot:", error);
            removeLoadingIndicator();
            addMessageToUI("Desculpe, não consegui processar sua pergunta. Tente novamente.", "bot");
        }
    }
}