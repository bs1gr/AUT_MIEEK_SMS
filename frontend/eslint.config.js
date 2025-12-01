// Flat config for ESLint v9
// Mirrors previous rules from .eslintrc.cjs with flat-compatible plugins

import js from "@eslint/js";
import * as tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import i18next from "eslint-plugin-i18next";
import testingLibrary from "eslint-plugin-testing-library";
import vitestPlugin from "eslint-plugin-vitest";
import prettier from "eslint-config-prettier";

const commonRules = {
  "react/react-in-jsx-scope": "off",
  "react/prop-types": "off",
  "no-console": ["warn", { allow: ["warn", "error"] }],
  "@typescript-eslint/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    },
  ],
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "@typescript-eslint/no-empty-object-type": "warn",
  "@typescript-eslint/ban-ts-comment": "warn",
  "@typescript-eslint/no-unused-expressions": "warn",
  "react-hooks/rules-of-hooks": "warn",
  "react-hooks/exhaustive-deps": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
  "react/no-unescaped-entities": "warn",
  "jsx-a11y/label-has-associated-control": "warn",
  "jsx-a11y/no-redundant-roles": "warn",
  "jsx-a11y/mouse-events-have-key-events": "warn",
  "jsx-a11y/click-events-have-key-events": "warn",
  "jsx-a11y/no-static-element-interactions": "warn",
  "jsx-a11y/no-noninteractive-tabindex": "warn",
  "testing-library/no-await-sync-queries": "warn",
  "testing-library/no-unnecessary-act": "warn",
  "testing-library/prefer-find-by": "warn",
  "prefer-const": "warn",
  "no-empty": ["warn", { allowEmptyCatch: true }],
  "i18next/no-literal-string": [
    "warn",
    {
      markupOnly: true,
      ignoreAttribute: [
        "className",
        "data-testid",
        "stroke",
        "fill",
        "aria-label",
        "aria-describedby",
        "role",
        "viewBox",
      ],
    },
  ],
};

export default [
  // Migrate entries previously stored in .eslintignore (deprecated).
  // See: eslint v9 flat config 'ignores' setting.
  { ignores: ["dist", "node_modules", "coverage", ".vite", ".vitest", "playwright-report"] },
  js.configs.recommended,
  // typescript-eslint flat presets
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}", "**/*.d.ts"],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Browser env
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      i18next,
      "testing-library": testingLibrary,
      vitest: vitestPlugin,
    },
    settings: {
      react: {
        version: "detect",
      },
      i18next: {
        ignoreTags: ["Trans"],
      },
    },
    rules: commonRules,
  },
  // Test file overrides
  {
    files: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        // Vitest globals (keep in sync with your test environment)
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "i18next/no-literal-string": "off",
      "vitest/no-focused-tests": "error",
      "vitest/no-identical-title": "warn",
      "vitest/no-conditional-tests": "warn",
      "vitest/expect-expect": "off",
      "testing-library/no-await-sync-queries": "warn",
    },
  },
  // Disable formatting-related rules via Prettier
  prettier,
];
