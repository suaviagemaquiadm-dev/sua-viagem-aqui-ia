const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { db, FieldValue } = require("../config");
const { GoogleGenAI, Type } = require("@google/genai");

// A chave de API do Gemini/OpenAI deve ser configurada como um segredo
const { openAIKey } = require("../config");

/**
 * Gera um roteiro de viagem usando a API do Gemini.
 * Apenas para usuários com a role 'traveler_plus'.
 */
exports.generateItinerary = onCall(
  { secrets: [openAIKey], region: "southamerica-east1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "A função só pode ser chamada por um usuário autenticado.",
      );
    }

    // Defesa em Profundidade: Verifica as custom claims do usuário no backend
    if (request.auth.token.role !== "traveler_plus") {
      throw new HttpsError(
        "permission-denied",
        "Apenas assinantes do plano Viajante Plus podem usar esta funcionalidade.",
      );
    }

    const prompt = request.data.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.length < 10) {
      throw new HttpsError(
        "invalid-argument",
        "O prompt fornecido é inválido ou muito curto.",
      );
    }

    try {
      const geminiApiKey = openAIKey.value();
      if (!geminiApiKey) {
        throw new Error("A chave de API do Gemini não está configurada no ambiente.");
      }
      const ai = new GoogleGenAI({apiKey: geminiApiKey});
      
      const systemInstruction = `
          Você é um especialista em viagens e um assistente para a plataforma "Sua Viagem Aqui".
          Sua tarefa é criar um roteiro de viagem detalhado e bem formatado em Markdown.
          O roteiro deve ser prático, inspirador e fácil de ler.
          Sempre inclua:
          1.  Um título principal (H1) criativo para o roteiro.
          2.  Uma breve introdução sobre o destino.
          3.  Separe o roteiro por dias (ex: "Dia 1: Chegada e Exploração", "Dia 2: Cultura e Gastronomia") usando H2.
          4.  Para cada dia, sugira atividades para manhã, tarde e noite usando H3.
          5.  Descreva cada sugestão de forma concisa.
          6.  Use listas (bullets) para detalhar atividades ou dicas.
          7.  Finalize com uma seção de "Dicas Extras" (H2) com conselhos úteis sobre o destino.
          NÃO inclua nenhuma mensagem antes do título H1 ou depois do conteúdo do roteiro. A resposta deve ser apenas o Markdown do roteiro.
      `;
      
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
          }
      });

      const itineraryMarkdown = response.text;
      if (!itineraryMarkdown) {
        throw new Error("A resposta da IA estava vazia.");
      }
      
      // Salva o roteiro no Firestore
      const userItinerariesRef = db.collection('users').doc(request.auth.uid).collection('itineraries');
      const newItineraryRef = await userItinerariesRef.add({
          title: `Roteiro para ${request.data.destination || 'seu destino'}`,
          prompt: prompt,
          itineraryMarkdown: itineraryMarkdown,
          ownerId: request.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
          public: false, // Roteiros são privados por padrão
      });

      // Monitoramento (SRE): Incrementa o contador de roteiros gerados
      const metricsRef = db.doc("stats/metrics");
      await metricsRef.update({
        itinerariesGenerated: FieldValue.increment(1),
      });

      return { success: true, roteiroId: newItineraryRef.id, itinerary: itineraryMarkdown };
    } catch (error) {
      logger.error("Erro na API do Gemini ao gerar roteiro:", error);
      throw new HttpsError(
        "internal",
        "Falha ao comunicar com a IA para gerar o roteiro.",
        error.message,
      );
    }
  });

/**
 * Sugere um destino de viagem aleatório usando a API do Gemini.
 */
exports.suggestDestination = onCall({ secrets: [openAIKey], region: "southamerica-east1" }, async (request) => {
    try {
        const geminiApiKey = openAIKey.value();
        if (!geminiApiKey) {
            throw new HttpsError("internal", "A chave da API do Gemini não está configurada.");
        }
        const ai = new GoogleGenAI({apiKey: geminiApiKey});

        const systemInstruction = `
            Você é um especialista em viagens criativo para a plataforma "Sua Viagem Aqui".
            Sua tarefa é sugerir um destino de viagem único e interessante no Brasil.
            Evite destinos extremamente óbvios como Rio de Janeiro ou São Paulo, a menos que seja um ângulo muito específico.
            Foque em lugares com beleza natural, cultura rica ou experiências únicas.
            Sempre responda no formato JSON solicitado.
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Sugira um destino de viagem surpreendente no Brasil.",
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        destination: {
                            type: Type.STRING,
                            description: "O nome do destino, incluindo cidade/região e estado. Ex: 'Jalapão, TO'",
                        },
                        description: {
                            type: Type.STRING,
                            description: "Uma descrição curta e atrativa do lugar, com no máximo 2-3 frases, para despertar o interesse do viajante.",
                        },
                    },
                    required: ["destination", "description"],
                },
                temperature: 0.9,
            },
        });
        
        const result = JSON.parse(response.text);
        return { success: true, data: result };

    } catch (error) {
        logger.error("Erro na API do Gemini ao sugerir destino:", error);
        throw new HttpsError(
            "internal",
            "Não foi possível obter uma sugestão no momento. Tente novamente."
        );
    }
});
