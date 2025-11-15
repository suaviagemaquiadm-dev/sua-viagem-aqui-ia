
import { resolve } from "path";
import { defineConfig } from "vite";
import { glob } from "glob";

// Find all HTML files in the project root ('frontend/') to use as entry points
const input = Object.fromEntries(
  glob
    .sync(resolve(__dirname, "*.html"))
    .map((file) => [
      file.slice(__dirname.length + 1, -".html".length),
      file,
    ]),
);

export default defineConfig({
  // Project root is 'frontend/'. Vite serves from here.
  root: __dirname,
  // Static assets that are copied as-is to the root of 'dist'
  publicDir: "public",
  build: {
    // Build output directory
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input,
    },
  },
});
