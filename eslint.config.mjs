import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["node_modules/**", "out/**", ".vscode-test/**"]
  },
  {
    files: ["src/**/*.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node
      }
    }
  },
  {
    files: ["tests/**/*.js"],
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.commonjs
      }
    }
  }
);
