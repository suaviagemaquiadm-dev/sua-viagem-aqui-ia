

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { GoogleGenAI } = require("@google/genai");

const { openAIKey } = require("../config");

exports.askChatbot = onCall({ secrets: [openAIKey], region: "southamerica-east1" }, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "A função só pode ser chamada por um usuário autenticado.");
    }

    const { message, history } = request.data;

    if (!message || typeof message !== "string") {
        throw new HttpsError("invalid-argument", "A mensagem é obrigatória.");
    }

    try {
        const apiKey = openAIKey.value();
        if (!apiKey) {
            throw new HttpsError("internal", "A chave da API do Gemini não está configurada.");
        }
        const ai = new GoogleGenAI({apiKey: apiKey});
        
        const modelName = "gemini-2.5-flash";

        const systemInstruction = `
            Você é um assistente de viagens amigável e prestativo para a plataforma "Sua Viagem Aqui".
            Sua principal função é ajudar os usuários a planejar suas viagens, dar sugestões de destinos,
            responder a perguntas sobre a plataforma e fornecer informações turísticas gerais.
            Seja conciso e direto. Use formatação Markdown (como listas e negrito) para melhorar a legibilidade.
            Nunca diga que você é uma IA. Aja como um especialista humano.
        `;
        
        // O SDK do Gemini espera um formato específico para o histórico
        const contents = [
            ...history.map(msg => ({
                role: msg.role === 'bot' ? 'model' : 'user',
                parts: [{ text: msg.text }],
            })),
            { role: 'user', parts: [{ text: message }] }
        ];

        const response = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        const responseText = response.text;
        
        return {
            text: responseText,
            groundingChunks: [] // Mantido para compatibilidade, caso usemos no futuro
        };

    } catch (error) {
        logger.error("Erro ao chamar a API do Gemini no chatbot:", error);
        throw new HttpsError("internal", "Não foi possível obter uma resposta do assistente.", error.message);
    }
});