
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { GoogleGenAI } = require("@google/genai");

const { openAIKey } = require("../config");

// Palavras-chave que indicam uma pergunta baseada em localização
const LOCATION_KEYWORDS = [
    "onde", "restaurante", "hotel", "ponto turístico", "localização",
    "perto", "próximo a", "encontrar", "mapa", "endereço"
];

exports.askChatbot = onCall({ secrets: [openAIKey], region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
    }

    const { message, history, userLocation } = request.data;

    if (!message || typeof message !== "string") {
        throw new HttpsError("invalid-argument", "A mensagem é obrigatória.");
    }

    try {
        const apiKey = openAIKey.value();
        if (!apiKey) {
            throw new HttpsError("internal", "A chave da API do Gemini não está configurada.");
        }
        const ai = new GoogleGenAI({apiKey: apiKey});

        const userMessageLower = message.toLowerCase();
        const isLocationQuery = LOCATION_KEYWORDS.some(keyword => userMessageLower.includes(keyword));

        let modelName;
        let tools = [];
        let toolConfig = {};

        if (isLocationQuery) {
            modelName = "gemini-2.5-flash";
            tools.push({ googleMaps: {} });
            if (userLocation && userLocation.latitude && userLocation.longitude) {
                toolConfig = {
                    retrievalConfig: {
                        latLng: {
                            latitude: userLocation.latitude,
                            longitude: userLocation.longitude
                        }
                    }
                };
            }
             logger.info("Usando Gemini Flash com Google Maps Grounding.");
        } else {
            modelName = "gemini-2.5-flash-lite";
             logger.info("Usando Gemini Flash Lite para resposta rápida.");
        }

        const chatHistory = (history || []).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }],
        }));

        const contents = [...chatHistory, { role: 'user', parts: [{ text: message }] }];

        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                tools: tools.length > 0 ? tools : undefined,
                toolConfig: Object.keys(toolConfig).length > 0 ? toolConfig : undefined,
            }
        });

        const responseText = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        return {
            text: responseText,
            groundingChunks: groundingChunks
        };

    } catch (error) {
        logger.error("Erro ao chamar a API do Gemini no chatbot:", error);
        throw new HttpsError("internal", "Não foi possível obter uma resposta do assistente.", error.message);
    }
});
