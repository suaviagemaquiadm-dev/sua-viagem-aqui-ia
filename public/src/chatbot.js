
import { httpsCallable, functions, auth } from "./firebase.js";
import { showAlert } from "./ui/alert.js";

let chatHistory = [];
let converter;

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

    const toggleWidget = (show) => {
        if (show) {
            widget.classList.remove("hidden");
            toggleButton.classList.add("hidden");
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
            
            // Tenta obter a localização do usuário para melhores resultados
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                    callChatbotFunction(message, userLocation);
                },
                (error) => {
                    console.warn("Não foi possível obter a localização:", error.message);
                    callChatbotFunction(message, null);
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        }
    });
    
    function addMessageToUI(message, role, groundingChunks = []) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("chat-message", `chat-message-${role}`);
        
        let contentHTML;
        if (converter) {
            contentHTML = converter.makeHtml(message);
        } else {
            contentHTML = `<p>${message}</p>`;
        }

        if (groundingChunks && groundingChunks.length > 0) {
            contentHTML += '<div class="grounding-links"><strong>Fontes:</strong><ul>';
            groundingChunks.forEach(chunk => {
                if(chunk.maps) {
                    contentHTML += `<li><a href="${chunk.maps.uri}" target="_blank" rel="noopener noreferrer">${chunk.maps.title}</a></li>`;
                }
            });
            contentHTML += '</ul></div>';
        }

        messageDiv.innerHTML = contentHTML;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        if (role !== 'loading') {
            chatHistory.push({ role, text: message });
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

    async function callChatbotFunction(message, userLocation) {
        try {
            const askChatbot = httpsCallable(functions, "askChatbot");
            const result = await askChatbot({ message, history: chatHistory, userLocation });
            
            removeLoadingIndicator();
            addMessageToUI(result.data.text, "bot", result.data.groundingChunks);

        } catch (error) {
            console.error("Erro ao chamar a função do chatbot:", error);
            removeLoadingIndicator();
            addMessageToUI("Desculpe, não consegui processar sua pergunta. Tente novamente.", "bot");
        }
    }
}
