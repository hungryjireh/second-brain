import js from "@eslint/js";
import globals from "globals";
import prettierRecommended from "eslint-plugin-prettier/recommended";

const rootJsFiles = [
  "*.js",
  "api/**/*.js",
  "lib/**/*.js",
  "scripts/**/*.js",
  "tests/**/*.js",
];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.expo/**",
      "**/.vercel/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "webapp/**",
      "second-brain/**",
      "open-brain/**",
    ],
  },
  {
    files: rootJsFiles,
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: rootJsFiles,
    ...prettierRecommended,
  },
];
