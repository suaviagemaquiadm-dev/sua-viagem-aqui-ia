import globals from "globals";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  js.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // As regras customizadas podem ser adicionadas aqui.
    },
  },
  {
    ignores: ["dist/**", "*.config.js"],
  },
];
