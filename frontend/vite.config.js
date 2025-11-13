
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { glob } from 'glob';

// This setup finds all HTML files in the 'public' directory and creates
// corresponding entry points for the Vite build.
const input = Object.fromEntries(
  glob.sync(resolve(__dirname, 'public/**/*.html')).map(file => [
    // Creates a clean name for the entry point, e.g., 'index' or 'admin'
    file.slice(resolve(__dirname, 'public').length + 1, -'.html'.length),
    file
  ])
);

export default defineConfig({
  // The 'public' directory is the root of our source files.
  // Vite will serve from here in development.
  root: resolve(__dirname, 'public'),
  build: {
    // The build output will be placed in a 'dist' directory inside 'frontend'.
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input,
    },
  },
});
