import { defineConfig } from "oxfmt";

export default defineConfig({
  trailingComma: "none",
  overrides: [
    {
      files: ["*.md"],
      options: {
        printWidth: 100,
        proseWrap: "always"
      }
    }
  ],
  ignorePatterns: [
    ".idea/",
    ".next/",
    "pnpm-lock.yaml",
    "CHANGELOG.md",
    "dist",
    ".nuxt",
    ".changeset",
    "nuxt/.nuxt",
    ".output",
    "*.tgz",
    "node_modules",
    ".agent/skills",
    ".agents/skills",
    ".agents/**",
    "scripts/**/*.sh",
    "layer/envs/env.d.ts",
    ".starters/**",
    "content/**",
    "tmp/**"
  ]
});
