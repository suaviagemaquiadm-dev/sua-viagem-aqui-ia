import { resolve } from 'path';
import { defineConfig } from 'vite';
import { glob } from 'glob';

// Encontra todos os arquivos HTML na pasta 'public' para criar os pontos de entrada
const htmlFiles = glob.sync('public/**/*.html');
const input = htmlFiles.reduce((acc, file) => {
  const name = file.replace('public/', '').replace('.html', '');
  acc[name] = resolve(__dirname, file);
  return acc;
}, {});


export default defineConfig({
  root: 'public', // A raiz do nosso código-fonte
  build: {
    outDir: 'dist', // Onde o build será gerado
    emptyOutDir: true, // Limpa o diretório antes de cada build
    rollupOptions: {
      input,
    },
  },
});