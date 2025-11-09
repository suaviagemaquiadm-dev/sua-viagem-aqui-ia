import { protectPage } from "./auth-guard.js";
import {
  db,
  doc,
  updateDoc,
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "./firebase.js";
import { showAlert } from "./ui/alert.js";

protectPage("traveler", (user, userData) => {
  if (!user || !userData) {
    // A guarda de rota já redireciona, mas como segurança adicional:
    document.getElementById("loading-state").classList.add("hidden");
    document.getElementById("permission-denied").classList.remove("hidden");
    return;
  }

  // --- Cache de Elementos do DOM ---
  const viewContainer = document.getElementById("profile-view-container");
  const editContainer = document.getElementById("profile-edit-container");
  const editForm = document.getElementById("profile-edit-form");

  const profilePicView = document.getElementById("profile-picture-view");
  const userNameView = document.getElementById("user-name-view");
  const userEmailView = document.getElementById("user-email-view");
  const userControlCodeView = document.getElementById("user-control-code-view");

  const profilePicEdit = document.getElementById("profile-picture-edit");
  const userNameEdit = document.getElementById("user-name-edit");
  const photoUploadInput = document.getElementById("photo-upload");

  const uploadProgressContainer = document.getElementById(
    "upload-progress-container",
  );
  const uploadProgressBar = document.getElementById("upload-progress-bar");

  // --- Funções de Renderização ---
  function populateView(data) {
    profilePicView.src =
      data.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.name,
      )}&background=1f2937&color=fcd34d`;
    userNameView.textContent = data.name;
    userEmailView.textContent = data.email;
    userControlCodeView.textContent = `Código de Controle: ${
      data.controlCode || "N/A"
    }`;
  }

  function populateEdit(data) {
    profilePicEdit.src =
      data.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        data.name,
      )}&background=1f2937&color=fcd34d`;
    userNameEdit.value = data.name;
  }

  function toggleEditMode(isEditing) {
    if (isEditing) {
      populateEdit(userData);
      viewContainer.classList.add("hidden");
      editContainer.classList.remove("hidden");
    } else {
      // Atualiza userData com os dados mais recentes antes de renderizar
      populateView(userData);
      editContainer.classList.add("hidden");
      viewContainer.classList.remove("hidden");
    }
  }
  
   function toggleButtonLoading(button, isLoading) {
    button.disabled = isLoading;
    const text = button.querySelector('.submit-text');
    const loading = button.querySelector('.submit-loading');
    if (isLoading) {
      text.classList.add('hidden');
      loading.classList.remove('hidden');
    } else {
      text.classList.remove('hidden');
      loading.classList.add('hidden');
    }
  }

  // --- Lógica de Eventos ---
  document
    .getElementById("edit-profile-btn")
    .addEventListener("click", () => toggleEditMode(true));
  document
    .getElementById("cancel-edit-btn")
    .addEventListener("click", () => toggleEditMode(false));
  
  photoUploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        profilePicEdit.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });


  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-profile-btn');
    toggleButtonLoading(saveBtn, true);

    const newName = userNameEdit.value;
    const photoFile = photoUploadInput.files[0];
    const userRef = doc(db, "users", user.uid);

    try {
      if (photoFile) {
        // Upload da nova foto
        const filePath = `profile_pictures/${user.uid}/${Date.now()}_${
          photoFile.name
        }`;
        const storageRef = ref(storage, filePath);
        const uploadTask = uploadBytesResumable(storageRef, photoFile);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadProgressContainer.classList.remove("hidden");
            uploadProgressBar.style.width = `${progress}%`;
          },
          (error) => {
            console.error("Falha no upload:", error);
            showAlert("Erro ao fazer upload da imagem.");
            toggleButtonLoading(saveBtn, false);
          },
          async () => {
            // Upload concluído, obtém URL e salva tudo
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await updateProfileData(userRef, newName, downloadURL);
            toggleButtonLoading(saveBtn, false);
          },
        );
      } else {
        // Apenas atualiza o nome
        await updateProfileData(userRef, newName);
        toggleButtonLoading(saveBtn, false);
      }
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        showAlert("Não foi possível salvar as alterações.");
        toggleButtonLoading(saveBtn, false);
    }
  });

  async function updateProfileData(userRef, name, photoURL) {
      const dataToUpdate = { name: name };
      if (photoURL) {
          dataToUpdate.photoURL = photoURL;
      }

      await updateDoc(userRef, dataToUpdate);

      // Atualiza o objeto local para refletir na UI
      userData.name = name;
      if (photoURL) {
          userData.photoURL = photoURL;
      }
      
      showAlert("Perfil atualizado com sucesso!");
      uploadProgressContainer.classList.add("hidden");
      toggleEditMode(false);
  }

  // --- Inicialização ---
  populateView(userData);
});
