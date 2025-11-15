
import { resolve } from "path";
import { defineConfig } from "vite";
import { glob } from "glob";

// Find all HTML files in the project root ('frontend/') to use as entry points
const input = {
  index: resolve(__dirname, "index.html"),
  meus_favoritos: resolve(__dirname, "meus_favoritos.html"),
  meu_feed: resolve(__dirname, "meu_feed.html"),
  cadastro_viajante_plus: resolve(__dirname, "cadastro_viajante_plus.html"),
  cadastro_viajante: resolve(__dirname, "cadastro_viajante.html"),
  cadastro_anunciantes: resolve(__dirname, "cadastro_anunciantes.html"),
  pagina_login: resolve(__dirname, "pagina_login.html"),
  admin: resolve(__dirname, "admin.html"),
  ad_details: resolve(__dirname, "ad_details.html"),
  buscar_parceiros: resolve(__dirname, "buscar_parceiros.html"),
  contato: resolve(__dirname, "contato.html"),
  meus_roteiros: resolve(__dirname, "meus_roteiros.html"),
  offline: resolve(__dirname, "offline.html"),
  perfil_publico: resolve(__dirname, "perfil_publico.html"),
};

export default defineConfig({
  root: __dirname,
  publicDir: "public",
  resolve: {
    alias: {
      "/src": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
