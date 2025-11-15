import { protectPage } from "./auth-guard.js";
import {
  db,
  storage,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "./firebase.js";
import { showAlert } from "./ui/alert.js";

protectPage("advertiser", (user, partnerData) => {
  if (!user || !partnerData) {
    document.getElementById("loading-container").classList.add("hidden");
    return;
  }

  let currentPartnerData = partnerData;
  let offersUnsubscribe = null;
  let postsUnsubscribe = null;

  // --- Cache DOM Elements ---
  const loadingContainer = document.getElementById("loading-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const tabsContainer = document.getElementById("tabs-container");
  const tabPanels = document.querySelectorAll(".tab-panel");
  const tabButtons = document.querySelectorAll(".tab-button");

  // Profile
  const viewContainer = document.getElementById("view-container");
  const profilePicView = document.getElementById("profile-picture-advertiser");
  const companyNameView = document.getElementById("view-companyName");
  const cnpjView = document.getElementById("view-cnpj");
  const locationView = document.getElementById("view-location");
  const emailView = document.getElementById("view-email");
  const editBtn = document.getElementById("edit-btn");
  const editContainer = document.getElementById("edit-container");
  const profileForm = document.getElementById("profile-form");
  const photoUploadInput = document.getElementById("photo-upload-advertiser");

  // Ad
  const adViewContainer = document.getElementById("ad-view-container");
  const adEditContainer = document.getElementById("ad-edit-container");
  const editAdBtn = document.getElementById("edit-ad-btn");
  const adForm = document.getElementById("ad-form");

  // Offers
  const offerForm = document.getElementById("offer-form");
  const offersList = document.getElementById("offers-list");
  const noOffersMessage = document.getElementById("no-offers-message");

  // Blog
  const postForm = document.getElementById("post-form");
  const postsList = document.getElementById("posts-list");
  const noPostsMessage = document.getElementById("no-posts-message");

  // Analytics
  const profileViewsStat = document.getElementById("stats-profile-views");
  const whatsappClicksStat = document.getElementById("stats-whatsapp-clicks");
  const favoritesStat = document.getElementById("stats-favorites");

  // --- Main Initialization ---
  function initializeDashboard() {
    loadingContainer.classList.add("hidden");
    dashboardContainer.classList.remove("hidden");
    
    setupTabs();
    
    // Profile Tab
    populateProfileView(currentPartnerData);
    setupProfileEditing();
    
    // Ad Tab
    populateAdView(currentPartnerData);
    setupAdEditing();
    
    // Offers Tab
    setupOfferCreation();
    
    // Blog Tab
    setupPostCreation();
  }

  // --- Tab Logic ---
  function setupTabs() {
    tabsContainer.setAttribute("role", "tablist");
    tabButtons.forEach(button => {
        button.setAttribute("role", "tab");
        const panelId = `tab-${button.dataset.tab}`;
        button.setAttribute("aria-controls", panelId);
        button.setAttribute("aria-selected", button.classList.contains("active"));
    });


    tabsContainer.addEventListener("click", (e) => {
      const targetButton = e.target.closest(".tab-button");
      if (!targetButton) return;

      const tabName = targetButton.dataset.tab;
      
      // Unsubscribe from listeners on other tabs to save resources
      if(offersUnsubscribe) offersUnsubscribe();
      if(postsUnsubscribe) postsUnsubscribe();

      tabButtons.forEach((btn) => {
          btn.classList.remove("active");
          btn.setAttribute("aria-selected", "false");
      });
      targetButton.classList.add("active");
      targetButton.setAttribute("aria-selected", "true");


      tabPanels.forEach((panel) => {
        panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
      });

      // Load content for tab if needed
      if (tabName === "offers") loadOffers();
      if (tabName === "blog") loadPosts();
      if (tabName === "analytics") loadAnalytics();
      if (tabName === "messages") {
        document.getElementById('tab-messages').innerHTML = `
            <div class="glass-effect rounded-3xl p-8 text-center">
                <i class="fas fa-comments text-5xl text-cyan-400 mb-4"></i>
                <h3 class="text-2xl font-bold text-white">Mensagens em Breve</h3>
                <p class="text-slate-400 mt-2">Estamos trabalhando em um sistema de chat para facilitar sua comunicação com os clientes.</p>
            </div>
        `;
      }
    });
  }

  // --- Analytics Logic ---
  function loadAnalytics() {
    profileViewsStat.textContent = currentPartnerData.profileViews || 0;
    whatsappClicksStat.textContent = currentPartnerData.whatsappClicks || 0;
    favoritesStat.textContent = currentPartnerData.favoritesCount || 0; // Será 0 por enquanto
  }

  // --- Profile Logic ---
  function populateProfileView(data) {
    profilePicView.src = data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.businessName)}&background=1f2937&color=fcd34d`;
    companyNameView.textContent = data.businessName;
    cnpjView.textContent = data.cnpj;
    locationView.textContent = `${data.city}, ${data.state}`;
    emailView.textContent = user.email;
    viewContainer.classList.remove("hidden");
  }

  function setupProfileEditing() {
    IMask(document.getElementById('cnpj'), { mask: '00.000.000/0000-00' });

    editBtn.addEventListener("click", () => {
      viewContainer.classList.add("hidden");
      profileForm.reset();
      document.getElementById('companyName').value = currentPartnerData.businessName;
      document.getElementById('cnpj').value = currentPartnerData.cnpj;
      // You might need to pre-load and set the state/city here
      editContainer.classList.remove("hidden");
    });

    cancelBtn.addEventListener("click", () => {
      editContainer.classList.add("hidden");
      viewContainer.classList.remove("hidden");
    });
    
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Handle form submission to update profile data in Firestore
        showAlert("Funcionalidade de salvar perfil a ser implementada.");
    });
  }
  
  // --- Ad Logic ---
  function populateAdView(data) {
    const adCategory = document.getElementById("view-ad-category");
    const adDescription = document.getElementById("view-ad-description");
    const adTags = document.getElementById("view-ad-tags");
    
    adCategory.textContent = (data.category || "Não definida").replace(/_/g, " ");
    adDescription.textContent = data.description || "Nenhuma descrição fornecida.";
    adTags.innerHTML = (data.tags || []).map(tag => `<span class="bg-slate-700 text-amber-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">${tag}</span>`).join(" ");

    adViewContainer.classList.remove("hidden");
  }

  function setupAdEditing() {
    const adDescriptionInput = document.getElementById("ad-description");
    const adDescriptionPreview = document.getElementById("ad-description-preview");
    const converter = new showdown.Converter({ simpleLineBreaks: true });

    editAdBtn.addEventListener("click", () => {
        adViewContainer.classList.add("hidden");
        // Populate form with current data
        const currentDescription = currentPartnerData.description || "";
        document.getElementById("ad-category").value = currentPartnerData.category || "";
        adDescriptionInput.value = currentDescription;
        document.getElementById("ad-tags").value = (currentPartnerData.tags || []).join(", ");
        
        // Update preview on open
        adDescriptionPreview.innerHTML = converter.makeHtml(currentDescription);
        
        adEditContainer.classList.remove("hidden");
    });
    
    // Live preview listener
    adDescriptionInput.addEventListener("input", () => {
        const markdownText = adDescriptionInput.value;
        adDescriptionPreview.innerHTML = converter.makeHtml(markdownText);
    });

    document.getElementById("cancel-ad-btn").addEventListener("click", () => {
        adEditContainer.classList.add("hidden");
        adViewContainer.classList.remove("hidden");
    });

    adForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveButton = document.getElementById("save-ad-btn");
        saveButton.disabled = true;

        const updatedData = {
            category: document.getElementById("ad-category").value,
            description: document.getElementById("ad-description").value,
            tags: document.getElementById("ad-tags").value.split(',').map(tag => tag.trim()).filter(Boolean),
        };

        try {
            const partnerRef = doc(db, "partners", user.uid);
            await updateDoc(partnerRef, updatedData);
            
            // Update local data and UI
            currentPartnerData = { ...currentPartnerData, ...updatedData };
            populateAdView(currentPartnerData);
            
            showAlert("Anúncio atualizado com sucesso!");
            adEditContainer.classList.add("hidden");
            adViewContainer.classList.remove("hidden");
        } catch (error) {
            console.error("Erro ao atualizar anúncio:", error);
            showAlert("Falha ao atualizar o anúncio.");
        } finally {
            saveButton.disabled = false;
        }
    });
  }

  // --- Offers Logic ---
  function setupOfferCreation() {
    offerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveButton = document.getElementById("save-offer-btn");
        saveButton.disabled = true;
        
        const title = document.getElementById("offer-title").value;
        const description = document.getElementById("offer-description").value;

        try {
            const offersRef = collection(db, "partners", user.uid, "offers");
            await addDoc(offersRef, {
                title,
                description,
                createdAt: serverTimestamp(),
                active: true,
            });
            showAlert("Oferta publicada com sucesso!");
            offerForm.reset();
        } catch(error) {
            console.error("Erro ao criar oferta:", error);
            showAlert("Falha ao publicar a oferta.");
        } finally {
            saveButton.disabled = false;
        }
    });
  }

  function loadOffers() {
    const q = query(collection(db, "partners", user.uid, "offers"), orderBy("createdAt", "desc"));
    offersUnsubscribe = onSnapshot(q, (snapshot) => {
        offersList.innerHTML = '';
        if (snapshot.empty) {
            noOffersMessage.classList.remove("hidden");
        } else {
            noOffersMessage.classList.add("hidden");
            snapshot.forEach(doc => {
                const offer = { id: doc.id, ...doc.data() };
                const offerEl = createOfferElement(offer);
                offersList.appendChild(offerEl);
            });
        }
    });
  }

  function createOfferElement(offer) {
    const el = document.createElement("div");
    el.className = "bg-slate-700/50 p-4 rounded-lg flex justify-between items-center";
    el.innerHTML = `
        <div>
            <p class="font-bold text-white">${offer.title}</p>
            <p class="text-sm text-slate-300">${offer.description}</p>
        </div>
        <button data-id="${offer.id}" class="delete-offer-btn text-red-500 hover:text-red-400"><i class="fas fa-trash"></i></button>
    `;
    el.querySelector(".delete-offer-btn").addEventListener("click", async (e) => {
        if(confirm("Tem certeza que deseja excluir esta oferta?")) {
            const offerId = e.currentTarget.dataset.id;
            await deleteDoc(doc(db, "partners", user.uid, "offers", offerId));
            showAlert("Oferta excluída.");
        }
    });
    return el;
  }

  // --- Blog Logic ---
  function setupPostCreation() {
    postForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Similar to offer creation
        const saveButton = document.getElementById("save-post-btn");
        saveButton.disabled = true;
        
        const title = document.getElementById("post-title").value;
        const content = document.getElementById("post-content").value;

        try {
            const postsRef = collection(db, "partners", user.uid, "posts");
            await addDoc(postsRef, {
                title,
                content, // Markdown content
                createdAt: serverTimestamp(),
            });
            showAlert("Post publicado com sucesso!");
            postForm.reset();
        } catch(error) {
            console.error("Erro ao criar post:", error);
            showAlert("Falha ao publicar o post.");
        } finally {
            saveButton.disabled = false;
        }
    });
  }

  function loadPosts() {
    const q = query(collection(db, "partners", user.uid, "posts"), orderBy("createdAt", "desc"));
    postsUnsubscribe = onSnapshot(q, (snapshot) => {
        postsList.innerHTML = '';
        if (snapshot.empty) {
            noPostsMessage.classList.remove("hidden");
        } else {
            noPostsMessage.classList.add("hidden");
            snapshot.forEach(doc => {
                const post = { id: doc.id, ...doc.data() };
                const postEl = createPostElement(post);
                postsList.appendChild(postEl);
            });
        }
    });
  }

  function createPostElement(post) {
      const el = document.createElement("div");
      el.className = "bg-slate-700/50 p-4 rounded-lg";
      el.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h4 class="font-bold text-white text-lg">${post.title}</h4>
                <p class="text-xs text-slate-400">Publicado em: ${post.createdAt.toDate().toLocaleDateString()}</p>
            </div>
            <button data-id="${post.id}" class="delete-post-btn text-red-500 hover:text-red-400 ml-4"><i class="fas fa-trash"></i></button>
        </div>
        <p class="text-sm text-slate-300 mt-2 line-clamp-2">${post.content}</p>
      `;
      el.querySelector(".delete-post-btn").addEventListener("click", async (e) => {
        if(confirm("Tem certeza que deseja excluir este post?")) {
            const postId = e.currentTarget.dataset.id;
            await deleteDoc(doc(db, "partners", user.uid, "posts", postId));
            showAlert("Post excluído.");
        }
    });
    return el;
  }


  // --- Run Initializer ---
  initializeDashboard();
});