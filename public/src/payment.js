import { functions, httpsCallable } from "/src/firebase.js";
import { showAlert } from "/src/ui/alert.js";

let MERCADO_PAGO_PUBLIC_KEY = null;

/**
 * Busca a chave pública do Mercado Pago do backend de forma segura.
 * Armazena a chave em cache na sessionStorage para evitar chamadas repetidas.
 */
async function getMercadoPagoPublicKey() {
    if (MERCADO_PAGO_PUBLIC_KEY) return MERCADO_PAGO_PUBLIC_KEY;

    const cachedKey = sessionStorage.getItem('mpPublicKey');
    if (cachedKey) {
        MERCADO_PAGO_PUBLIC_KEY = cachedKey;
        return cachedKey;
    }

    try {
        const getFrontendConfig = httpsCallable(functions, 'getFrontendConfig');
        const result = await getFrontendConfig();
        const publicKey = result.data.mercadoPagoPublicKey;
        if (!publicKey) throw new Error("Chave pública não recebida do backend.");

        MERCADO_PAGO_PUBLIC_KEY = publicKey;
        sessionStorage.setItem('mpPublicKey', publicKey);
        return publicKey;
    } catch (error) {
        console.error("Erro ao buscar a chave pública do Mercado Pago:", error);
        showAlert("Erro de configuração de pagamento. Não foi possível carregar a chave.");
        throw error;
    }
}


/**
 * Cria uma preferência de pagamento no Mercado Pago e renderiza o checkout.
 * @param {string} title - Título do produto.
 * @param {number} price - Preço do produto.
 * @param {string} userId - ID do usuário no Firebase.
 * @param {string} email - Email do usuário.
 * @param {'partner_subscription' | 'user_subscription'} transactionType - O tipo de transação.
 */
export async function createCheckout(
  title,
  price,
  userId,
  email,
  transactionType,
) {
  try {
    const createPreference = httpsCallable(
      functions,
      "createMercadoPagoPreference",
    );
    const result = await createPreference({
      title,
      price,
      userId,
      email,
      transactionType,
    });

    const preferenceId = result.data.preferenceId;
    if (preferenceId) {
      await renderCheckoutBrick(preferenceId, price);
    } else {
      throw new Error("ID da preferência não foi retornado.");
    }
  } catch (error) {
    console.error("Erro ao criar checkout:", error);
    showAlert(
      "Não foi possível iniciar o pagamento. Tente novamente mais tarde.",
    );
    const walletContainer = document.getElementById("wallet_container");
    if (walletContainer) {
      walletContainer.innerHTML = `<p class="text-red-400">Falha ao carregar o checkout.</p>`;
    }
  }
}

/**
 * Renderiza o "Checkout Brick" do Mercado Pago.
 * @param {string} preferenceId - O ID da preferência de pagamento.
 * @param {number} price - O valor da transação.
 */
async function renderCheckoutBrick(preferenceId, price) {
  try {
    const publicKey = await getMercadoPagoPublicKey();
    const mp = new MercadoPago(publicKey);
    const bricksBuilder = mp.bricks();

    const renderCardPaymentBrick = async (builder) => {
      const settings = {
        initialization: {
          amount: price, // Usa o preço da função para garantir consistência.
          preferenceId: preferenceId,
        },
        customization: {
          visual: {
            style: {
              theme: "dark",
            },
          },
        },
        callbacks: {
          onReady: () => {
            /* Callback chamado quando o Brick está pronto. */
          },
          onSubmit: ({ selectedPaymentMethod, formData }) => {
            // A lógica de processamento ocorre no backend via webhook
            return new Promise((resolve, reject) => {
               resolve();
            });
          },
          onError: (error) => {
            console.error(error);
            showAlert("Ocorreu um erro durante o pagamento.");
          },
        },
      };
      // Garante que o container esteja limpo antes de renderizar
      const container = document.getElementById("wallet_container");
      if (container) container.innerHTML = '';
      
      window.cardPaymentBrickController = await builder.create(
        "cardPayment",
        "wallet_container", // ID do container
        settings,
      );
    };

    await renderCardPaymentBrick(bricksBuilder);
  } catch (error) {
      const container = document.getElementById("wallet_container");
      if(container) container.innerHTML = `<p class="text-red-500 text-center">Erro ao inicializar o módulo de pagamento.</p>`;
  }
}