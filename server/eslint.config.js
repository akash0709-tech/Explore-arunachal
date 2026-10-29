// ESLint 9 "flat" config. Prettier handles formatting, ESLint handles code mistakes.
import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["node_modules/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      // Allow unused args that start with _ (e.g. (_req, res) => ...) and fields left out with { a, ...rest }
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "prefer-const": "error",
      eqeqeq: ["error", "always"]
    }
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.jest } }
  },
  // Must be last: turns off rules that would fight with Prettier
  prettier
];
