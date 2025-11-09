import {
  db,
  functions,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  signOut,
  httpsCallable,
  auth,
} from '/src/firebase.js';
import { protectPage } from '/src/auth-guard.js';

let allPartnersData = [];
let plansChart;

protectPage('admin', () => {
  setupAdminPanel();
});

function setupAdminPanel() {
  const partnersCol = collection(db, 'partners');
  onSnapshot(partnersCol, (snapshot) => {
    allPartnersData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    updateDashboard(allPartnersData);
    renderPartnersTable(allPartnersData);
  });

  // Carrega e renderiza a lista de administradores
  loadAndRenderAdmins();
}

// --- DASHBOARD ---
function updateDashboard(partners) {
  document.getElementById('total-partners').textContent = partners.length;
  const activePartners = partners.filter((p) => p.status === 'aprovado');
  document.getElementById('active-partners').textContent = activePartners.length;

  const freePlans = activePartners.filter(p => p.plan === 'free');
  document.getElementById('free-plans').textContent = freePlans.length;

  const paidSubscribers = activePartners.filter(
    (p) => p.plan && p.plan !== 'free',
  );
  document.getElementById('paid-subscribers').textContent =
    paidSubscribers.length;

  const pendingPayments = partners.filter(
    (p) => p.status === 'aguardando_pagamento',
  );
  document.getElementById('pending-payments').textContent =
    pendingPayments.length;

  updatePlansChart(partners);
}

function updatePlansChart(partners) {
  const ctx = document.getElementById('plans-chart').getContext('2d');
  const planCounts = partners.reduce((acc, partner) => {
    const plan = partner.plan || 'Nenhum';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  if (plansChart) {
    plansChart.destroy();
  }

  plansChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(planCounts),
      datasets: [
        {
          data: Object.values(planCounts),
          backgroundColor: [
            '#22d3ee',
            '#f59e0b',
            '#84cc16',
            '#ef4444',
            '#6b7280',
          ],
          borderColor: '#1e293b',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#cbd5e1',
          },
        },
      },
    },
  });
}

// --- PARTNERS TABLE & MANAGEMENT ---
function renderPartnersTable(partners) {
  const tableBody = document.getElementById('partners-table-body');
  tableBody.innerHTML = '';
  if (!partners || partners.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum parceiro encontrado.</td></tr>';
    return;
  }
  partners.forEach((partner) => {
    const tr = document.createElement('tr');
    tr.className = 'table-row';

    const statusColors = {
      aprovado: 'text-green-400',
      aguardando_aprovacao: 'text-orange-400',
      aguardando_pagamento: 'text-yellow-400',
      pendente: 'text-cyan-400',
      suspenso: 'text-red-500',
      rejeitado: 'text-red-600',
    };

    tr.innerHTML = `
<td class="p-4 font-medium text-white">${partner.businessName}</td>
<td class="p-4 text-slate-400">${partner.email}</td>
<td class="p-4">
  <span class="font-semibold capitalize">${partner.plan || 'Nenhum'}</span>
</td>
<td class="p-4">
  <span class="font-bold ${statusColors[partner.status] || 'text-slate-500'}"
    >${(partner.status || 'desconhecido').replace(/_/g, ' ')}</span
  >
</td>
<td class="p-4 text-center space-x-2">
  <select
    class="change-status-select bg-slate-700 border border-slate-600 rounded text-xs py-1"
    data-id="${partner.id}"
  >
    <option value="" disabled selected>Mudar Status</option>
    <option value="aprovado">Aprovar</option>
    <option value="suspenso">Suspender</option>
    <option value="rejeitado">Rejeitar</option>
    <option value="aguardando_pagamento">Aguardando Pagamento</option>
  </select>
  <button
    class="delete-btn text-red-500 hover:text-red-400"
    data-id="${partner.id}"
    title="Excluir Parceiro"
  >
    <i class="fas fa-trash"></i>
  </button>
</td>
`;
    tableBody.appendChild(tr);
  });
}

document.getElementById('search-partners').addEventListener('input', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  const filteredPartners = allPartnersData.filter(
    (p) =>
      p.businessName?.toLowerCase().includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm),
  );
  renderPartnersTable(filteredPartners);
});

// Event delegation for table actions
document.getElementById('partners-table-body').addEventListener('click', (e) => {
  const deleteBtn = e.target.closest('.delete-btn');
  if (deleteBtn) {
    const partnerId = deleteBtn.dataset.id;
    showConfirmation(
      'Tem certeza que deseja apagar este parceiro? Esta ação é irreversível e removerá a conta de autenticação e todos os dados associados.',
      () => deletePartner(partnerId),
    );
  }
});

document
  .getElementById('partners-table-body')
  .addEventListener('change', async (e) => {
    const selectEl = e.target;
    if (selectEl.classList.contains('change-status-select')) {
      const partnerId = selectEl.dataset.id;
      const newStatus = selectEl.value;
      if (newStatus) {
        const setPartnerStatus = httpsCallable(functions, 'setPartnerStatus');
        try {
            await setPartnerStatus({ partnerId, newStatus });
            showInfo(`Status do parceiro alterado para ${newStatus}.`);
        } catch(error) {
            console.error('Erro ao alterar status:', error);
            showInfo(`Erro: ${error.message}`);
        }
        selectEl.value = ""; // Reseta o select
      }
    }
  });

async function deletePartner(id) {
  const deletePartnerAccount = httpsCallable(functions, 'deletePartnerAccount');
  try {
    await deletePartnerAccount({ partnerId: id });
    showInfo('Parceiro e conta associada foram excluídos com sucesso.');
  } catch (error) {
    console.error('Erro ao excluir parceiro:', error);
    showInfo(`Erro ao excluir parceiro: ${error.message}`);
  }
}

// --- ADMIN MANAGEMENT ---

async function loadAndRenderAdmins() {
    const adminList = document.getElementById("admin-list");
    const listAdmins = httpsCallable(functions, 'listAdmins');
    try {
        const result = await listAdmins();
        const admins = result.data;
        adminList.innerHTML = ''; // Limpa o estado de "carregando"
        if (admins.length === 0) {
            adminList.innerHTML = '<li><p class="text-slate-400">Nenhum administrador encontrado.</p></li>';
        }
        admins.forEach(admin => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-slate-700/50 p-2 rounded';
            li.innerHTML = `
                <span>${admin.displayName || admin.email} <span class="text-xs text-slate-400">(${admin.email})</span></span>
                <button class="revoke-admin-btn text-red-500 hover:text-red-400 text-sm" data-uid="${admin.uid}" title="Revogar acesso de admin">
                    <i class="fas fa-user-slash mr-1"></i> Revogar
                </button>
            `;
            adminList.appendChild(li);
        });
    } catch (error) {
        console.error("Erro ao listar administradores:", error);
        adminList.innerHTML = '<li><p class="text-red-400">Falha ao carregar a lista de administradores.</p></li>';
    }
}

document.getElementById('admin-list').addEventListener('click', e => {
    const revokeBtn = e.target.closest('.revoke-admin-btn');
    if (revokeBtn) {
        const targetUid = revokeBtn.dataset.uid;
        showConfirmation('Tem certeza que deseja revogar os privilégios de administrador deste usuário?', () => {
            revokeAdminRole(targetUid);
        });
    }
});

async function revokeAdminRole(targetUid) {
    const revokeAdminRoleFn = httpsCallable(functions, 'revokeAdminRole');
    try {
        await revokeAdminRoleFn({ targetUid });
        showInfo('Privilégios de administrador revogados com sucesso.');
        loadAndRenderAdmins(); // Atualiza a lista
    } catch (error) {
        console.error("Erro ao revogar privilégios:", error);
        showInfo(`Erro: ${error.message}`);
    }
}


// --- MODALS (Alert, Confirmation) ---
const alertModal = document.getElementById('alert-modal');
function showInfo(message) {
  alertModal.querySelector('#alert-message').textContent = message;
  alertModal.querySelector('#alert-ok-btn').classList.remove('hidden');
  alertModal.querySelector('#alert-confirm-btn').classList.add('hidden');
  alertModal.querySelector('#alert-cancel-btn').classList.add('hidden');
  alertModal.classList.remove('hidden');
}
function showConfirmation(message, onConfirm) {
  alertModal.querySelector('#alert-message').textContent = message;
  alertModal.querySelector('#alert-ok-btn').classList.add('hidden');
  alertModal.querySelector('#alert-confirm-btn').classList.remove('hidden');
  alertModal.querySelector('#alert-cancel-btn').classList.remove('hidden');
  alertModal.classList.remove('hidden');

  const confirmBtn = alertModal.querySelector('#alert-confirm-btn');
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

  newConfirmBtn.addEventListener('click', () => {
    onConfirm();
    alertModal.classList.add('hidden');
  });
}
alertModal
  .querySelector('#alert-cancel-btn')
  .addEventListener('click', () => alertModal.classList.add('hidden'));
alertModal
  .querySelector('#alert-ok-btn')
  .addEventListener('click', () => alertModal.classList.add('hidden'));

// --- ADMIN ACTIONS ---
const createPartnerForm = document.getElementById('create-partner-form');
createPartnerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const createPartnerAccount = httpsCallable(functions, 'createPartnerAccount');
  try {
    await createPartnerAccount({
      businessName: createPartnerForm['create-businessName'].value,
      ownerName: createPartnerForm['create-ownerName'].value,
      email: createPartnerForm['create-email'].value,
      password: createPartnerForm['create-password'].value,
      plan: createPartnerForm['create-plan'].value,
    });
    showInfo('Conta de parceiro criada com sucesso!');
    createPartnerForm.reset();
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    showInfo(`Erro: ${error.message}`);
  }
});

const grantAdminForm = document.getElementById('grant-admin-form');
grantAdminForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('admin-email-input').value;
    const grantAdminRole = httpsCallable(functions, 'grantAdminRole');
    try {
        await grantAdminRole({ email });
        showInfo(`Usuário ${email} promovido a administrador.`);
        grantAdminForm.reset();
        loadAndRenderAdmins(); // Atualiza a lista
    } catch(error) {
        console.error("Erro ao promover admin:", error);
        showInfo(`Erro: ${error.message}`);
    }
});


// --- LOGOUT ---
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
});
