import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";

const rootJsFiles = [
  "*.js",
  "api/**/*.js",
  "lib/**/*.js",
  "scripts/**/*.js",
  "tests/**/*.js",
];

const nodeRuntimeGlobals = Object.fromEntries(
  Object.getOwnPropertyNames(globalThis).map((name) => [name, "readonly"]),
);

const nodeTestGlobals = {
  suite: "readonly",
  test: "readonly",
  before: "readonly",
  after: "readonly",
  beforeEach: "readonly",
  afterEach: "readonly",
  describe: "readonly",
  it: "readonly",
};

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
        ...nodeRuntimeGlobals,
        ...nodeTestGlobals,
      },
    },
  },
  {
    files: rootJsFiles,
    ...prettierRecommended,
  },
];
