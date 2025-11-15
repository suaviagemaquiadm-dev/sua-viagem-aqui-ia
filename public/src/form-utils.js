import { auth, db } from './firebase.js';
import { showAlert } from './ui/alert.js';
import { fetchSignInMethodsForEmail } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';


/**
 * Configura o preenchimento automático de endereço a partir do CEP.
 * @param {string} cepFieldId ID do campo de CEP.
 * @param {string} cityFieldId ID do campo da cidade.
 * @param {string} stateFieldId ID do campo do estado (UF).
 */
export function setupCepAutofill(cepFieldId, cityFieldId, stateFieldId) {
  const cepInput = document.getElementById(cepFieldId);
  const cityInput = document.getElementById(cityFieldId);
  const stateInput = document.getElementById(stateFieldId);

  if (!cepInput || !cityInput || !stateInput) return;

  cepInput.addEventListener("input", (e) => {
    let value = e.target.value.replace(/\D/g, "").substring(0, 8);
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    e.target.value = value;
  });

  cepInput.addEventListener("blur", async () => {
    const cep = cepInput.value.replace(/\D/g, "");
    cityInput.value = "";
    stateInput.value = "";

    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error("CEP não encontrado.");
        const data = await response.json();
        if (data.erro) {
          throw new Error("CEP inválido.");
        }
        cityInput.value = data.localidade;
        stateInput.value = data.uf;
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        showAlert("CEP não encontrado. Verifique e tente novamente.");
      }
    }
  });
}

/**
 * Configura a verificação de e-mail duplicado em tempo real.
 * @param {string} emailFieldId ID do campo de e-mail.
 */
export function setupRealtimeEmailCheck(emailFieldId) {
  const emailInput = document.getElementById(emailFieldId);
  if (!emailInput) return;

  let emailTimeout = null;
  emailInput.addEventListener("input", () => {
    clearTimeout(emailTimeout);
    emailTimeout = setTimeout(async () => {
      const email = emailInput.value.trim();
      if (!email || !email.includes("@")) {
        emailInput.classList.remove("border-red-500");
        return;
      }

      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        if (methods.length > 0) {
          emailInput.classList.add("border-red-500");
          showAlert(
            "Este e-mail já está cadastrado. Tente outro ou faça login.",
          );
        } else {
          emailInput.classList.remove("border-red-500");
        }
      } catch (error) {
        console.error("Erro ao verificar e-mail:", error);
        // Não mostra alerta para erros internos da API (ex: rede), apenas de validação.
      }
    }, 800);
  });
}
