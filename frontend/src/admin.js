
import {
  db,
  signOut,
  auth,
  doc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
} from "/src/firebase.js";
import { protectPage } from "/src/auth-guard.js";
import { callFunction } from "./apiService.js";

let allPartnersData = [];
let plansChart, dailyRegsChart;

// --- PAGE PROTECTION & INITIALIZATION ---
protectPage("admin", () => {
  document.getElementById("content-state").classList.remove("hidden");
  setupEventListeners();
  navigateToTab("dashboard");
  listenToPartners();
  listenToMetrics();
  loadDailyStatsForCharts();
  loadAndRenderAdmins();
});

// --- EVENT LISTENERS ---
function setupEventListeners() {
  document.getElementById("admin-nav").addEventListener("click", (e) => {
    e.preventDefault();
    const link = e.target.closest("a");
    if (link && link.dataset.tab) {
      navigateToTab(link.dataset.tab);
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    signOut(auth);
  });

  document.getElementById("search-partners").addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allPartnersData.filter(
      (p) =>
        p.businessName?.toLowerCase().includes(searchTerm) ||
        p.email?.toLowerCase().includes(searchTerm),
    );
    renderPartnersTable(filtered);
  });

  // Event delegation for table actions
  document.getElementById("partners-table-body").addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".delete-btn");
      if (deleteBtn) {
        const partnerId = deleteBtn.dataset.id;
        showConfirmation(
          `Tem certeza que deseja apagar este parceiro? A conta e todos os dados associados serão removidos permanentemente.`,
          () => deletePartner(partnerId),
        );
      }
    });

  document.getElementById("partners-table-body").addEventListener("change", async (e) => {
      const selectEl = e.target;
      if (selectEl.classList.contains("change-status-select")) {
        const partnerId = selectEl.dataset.id;
        const newStatus = selectEl.value;
        if (newStatus) {
          try {
            await callFunction("setPartnerStatus", { partnerId, newStatus });
            showInfo(`Status do parceiro alterado para ${newStatus}.`);
          } catch (error) {
            showInfo(`Erro: ${error.message}`);
          }
          selectEl.value = ""; // Reset select
        }
      }
    });

  document.getElementById("create-partner-form").addEventListener("submit", handleCreatePartner);
  document.getElementById("grant-admin-form").addEventListener("submit", handleGrantAdmin);
  document.getElementById("admin-list").addEventListener("click", handleRevokeAdmin);
}

// --- NAVIGATION ---
function navigateToTab(tabName) {
  document.querySelectorAll("#admin-nav a").forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === tabName);
    link.setAttribute("aria-current", link.dataset.tab === tabName ? "page" : "false");
  });

  document.querySelectorAll("main section").forEach((section) => {
    section.classList.toggle("hidden", section.id !== `${tabName}-section`);
  });

  const titles = {
    dashboard: "Dashboard",
    partners: "Gerenciar Parceiros",
    admins: "Gerenciar Administradores",
  };
  document.getElementById("main-title").textContent = titles[tabName] || "Admin";
}

// --- DATA LISTENERS & RENDERING ---
function listenToPartners() {
  const partnersCol = collection(db, "partners");
  onSnapshot(partnersCol, (snapshot) => {
    allPartnersData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    updateDashboardCards(allPartnersData);
    renderPartnersTable(allPartnersData);
    updatePlansChart(allPartnersData);
  }, (error) => console.error("Error listening to partners:", error));
}

function listenToMetrics() {
    const metricsRef = doc(db, "stats", "metrics");
    onSnapshot(metricsRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("total-users").textContent = data.totalUsers || 0;
            document.getElementById("total-partners").textContent = data.totalPartners || 0;
        }
    }, (error) => console.error("Error listening to metrics:", error));
}

function updateDashboardCards(partners) {
  const pending = partners.filter(p => p.status === 'aguardando_aprovacao' || p.status === 'aguardando_pagamento').length;
  const suspended = partners.filter(p => p.status === 'suspenso').length;
  document.getElementById("pending-approvals").textContent = pending;
  document.getElementById("suspended-partners").textContent = suspended;
}

function renderPartnersTable(partners) {
  const tableBody = document.getElementById("partners-table-body");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  if (partners.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" class="p-4 text-center text-slate-400">Nenhum parceiro encontrado.</td></tr>';
    return;
  }

  const statusMap = {
    aprovado: { text: "Aprovado", color: "text-green-400" },
    aguardando_aprovacao: { text: "Aguardando Aprovação", color: "text-orange-400" },
    aguardando_pagamento: { text: "Aguardando Pagamento", color: "text-yellow-400" },
    suspenso: { text: "Suspenso", color: "text-red-500" },
    rejeitado: { text: "Rejeitado", color: "text-red-600" },
  };

  partners.forEach((p) => {
    const statusInfo = statusMap[p.status] || { text: (p.status || 'desconhecido').replace(/_/g, ' '), color: "text-slate-500" };
    const row = `
      <tr class="border-b border-slate-700 hover:bg-slate-800/50">
        <td class="p-4 font-medium text-white">${p.businessName}</td>
        <td class="p-4 text-slate-400">${p.email}</td>
        <td class="p-4 font-semibold capitalize">${p.plan || "N/A"}</td>
        <td class="p-4 font-bold ${statusInfo.color}">${statusInfo.text}</td>
        <td class="p-4 text-center space-x-2">
          <select class="change-status-select bg-slate-700 border border-slate-600 rounded text-xs py-1 px-2" data-id="${p.id}">
            <option value="" disabled selected>Mudar Status</option>
            ${Object.keys(statusMap).map(key => `<option value="${key}">${statusMap[key].text}</option>`).join('')}
          </select>
          <button class="delete-btn text-red-500 hover:text-red-400 p-1" data-id="${p.id}" title="Excluir"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `;
    tableBody.innerHTML += row;
  });
}

// --- ADMIN MANAGEMENT ---
async function loadAndRenderAdmins() {
  const adminList = document.getElementById("admin-list");
  adminList.innerHTML = '<li><p class="text-slate-500"><i class="fas fa-spinner fa-spin mr-2"></i>Carregando...</p></li>';
  try {
    const result = await callFunction('listAdmins');
    adminList.innerHTML = '';
    result.forEach(admin => {
      const li = document.createElement('li');
      li.className = 'flex items-center justify-between bg-slate-700/50 p-2 rounded';
      li.innerHTML = `
        <span>${admin.displayName || admin.email}</span>
        <button class="revoke-admin-btn text-red-500 hover:text-red-400 text-sm" data-uid="${admin.uid}" title="Revogar acesso">
            <i class="fas fa-user-slash mr-1"></i> Revogar
        </button>
      `;
      adminList.appendChild(li);
    });
  } catch (error) {
    adminList.innerHTML = '<li><p class="text-red-400">Falha ao carregar administradores.</p></li>';
  }
}

// --- CHARTING ---
async function loadDailyStatsForCharts() {
  try {
    const dailyStatsRef = collection(db, "stats", "metrics", "daily");
    const q = query(dailyStatsRef, orderBy("date", "desc"), limit(15));
    const snapshot = await getDocs(q);
    
    const dailyData = {};
    snapshot.forEach(doc => {
      dailyData[doc.id] = doc.data();
    });

    const labels = Array.from({ length: 15 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    }).reverse();

    const usersData = labels.map(date => dailyData[date]?.newUsers || 0);
    const partnersData = labels.map(date => dailyData[date]?.newPartners || 0);
    
    renderDailyRegsChart(labels, usersData, partnersData);
  } catch(error) {
      console.error("Error fetching daily stats for charts:", error);
  }
}

function updatePlansChart(partners) {
  const ctx = document.getElementById("plans-chart")?.getContext("2d");
  if (!ctx) return;

  const planCounts = partners.reduce((acc, p) => {
    acc[p.plan || "N/A"] = (acc[p.plan || "N/A"] || 0) + 1;
    return acc;
  }, {});

  if (plansChart) plansChart.destroy();
  plansChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(planCounts),
      datasets: [{
        data: Object.values(planCounts),
        backgroundColor: ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#6b7280"],
        borderColor: "#1e293b",
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { color: "#cbd5e1" } } },
    },
  });
}

function renderDailyRegsChart(labels, usersData, partnersData) {
    const ctx = document.getElementById("daily-regs-chart")?.getContext("2d");
    if (!ctx) return;

    const chartOptions = {
        responsive: true,
        scales: {
            y: { beginAtZero: true, ticks: { color: "#94a3b8", stepSize: 1 }, grid: { color: "#334155" } },
            x: { ticks: { color: "#94a3b8" }, grid: { color: "transparent" } },
        },
        plugins: { legend: { labels: { color: "#cbd5e1" } } },
        interaction: { intersect: false, mode: 'index' },
    };

    if (dailyRegsChart) dailyRegsChart.destroy();
    dailyRegsChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels.map(l => new Date(l).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})),
            datasets: [
                { label: "Novos Usuários", data: usersData, borderColor: "#3b82f6", backgroundColor: "#3b82f633", fill: true, tension: 0.3 },
                { label: "Novos Parceiros", data: partnersData, borderColor: "#22c55e", backgroundColor: "#22c55e33", fill: true, tension: 0.3 },
            ],
        },
        options: chartOptions,
    });
}

// --- ACTION HANDLERS (for forms & buttons) ---
async function handleCreatePartner(e) {
  e.preventDefault();
  const form = e.target;
  try {
    await callFunction('createPartnerAccount', {
      businessName: form['create-businessName'].value,
      ownerName: form['create-ownerName'].value,
      email: form['create-email'].value,
      password: form['create-password'].value,
      plan: form['create-plan'].value,
    });
    showInfo('Conta de parceiro criada com sucesso!');
    form.reset();
  } catch (error) {
    showInfo(`Erro: ${error.message}`);
  }
}

async function deletePartner(id) {
  try {
    await callFunction('deletePartnerAccount', { partnerId: id });
    showInfo("Parceiro excluído com sucesso.");
  } catch (error) {
    showInfo(`Erro ao excluir: ${error.message}`);
  }
}

async function handleGrantAdmin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email-input').value;
  try {
    await callFunction('grantAdminRole', { email });
    showInfo(`Usuário ${email} promovido a administrador.`);
    e.target.reset();
    loadAndRenderAdmins();
  } catch (error) {
    showInfo(`Erro: ${error.message}`);
  }
}

function handleRevokeAdmin(e) {
  const revokeBtn = e.target.closest('.revoke-admin-btn');
  if (revokeBtn) {
    const targetUid = revokeBtn.dataset.uid;
    showConfirmation(
      "Tem certeza que deseja revogar os privilégios de admin deste usuário?",
      async () => {
        try {
          await callFunction('revokeAdminRole', { targetUid });
          showInfo('Privilégios revogados com sucesso.');
          loadAndRenderAdmins();
        } catch (error) {
          showInfo(`Erro: ${error.message}`);
        }
      },
    );
  }
}

// --- MODALS ---
const alertModal = document.getElementById("alert-modal");
const okBtn = alertModal.querySelector("#alert-ok-btn");
const confirmBtn = alertModal.querySelector("#alert-confirm-btn");
const cancelBtn = alertModal.querySelector("#alert-cancel-btn");

function showInfo(message) {
  alertModal.querySelector("#alert-message").textContent = message;
  okBtn.classList.remove("hidden");
  confirmBtn.classList.add("hidden");
  cancelBtn.classList.add("hidden");
  alertModal.classList.remove("hidden");
}

function showConfirmation(message, onConfirm) {
  alertModal.querySelector("#alert-message").textContent = message;
  okBtn.classList.add("hidden");
  confirmBtn.classList.remove("hidden");
  cancelBtn.classList.remove("hidden");
  alertModal.classList.remove("hidden");

  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.addEventListener("click", () => {
    onConfirm();
    alertModal.classList.add("hidden");
  }, { once: true });
}

okBtn.addEventListener("click", () => alertModal.classList.add("hidden"));
cancelBtn.addEventListener("click", () => alertModal.classList.add("hidden"));