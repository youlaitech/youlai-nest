import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/logs/**",
      "*.config.js",
      ".eslintrc.js",
    ],
  },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module",
        ecmaVersion: "latest",
      },
      globals: {
        ...globals.node,
        ...globals.es2022,
        ...globals.jest,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",

      "no-console": "warn",
      "no-debugger": "error",
      "no-undef": "off",
      eqeqeq: ["error", "always"],
      curly: "error",

      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },

  {
    files: ["**/*.d.ts"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-undef": "off",
    },
  },

  prettierConfig,
];
