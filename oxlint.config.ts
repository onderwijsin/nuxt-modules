import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["jsdoc", "typescript", "vue"],
  categories: {
    correctness: "warn"
  },
  rules: {
    "jsdoc/check-tag-names": ["error", { definedTags: ["fileoverview"] }],
    "jsdoc/require-param": "error",
    "jsdoc/require-param-description": "error",
    "jsdoc/require-returns": "error",
    "jsdoc/require-returns-description": "error",
    "vue/prop-name-casing": "off",
    "eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ]
  },
  ignorePatterns: [
    ".nuxt/**",
    ".output/**",
    "dist/**",
    "coverage/**",
    "**/*.tgz",
    ".agents/**",
    ".starters/**",
    "docs/content/**",
    "env.d.ts",
    "layer/envs/env.d.ts"
  ]
});
