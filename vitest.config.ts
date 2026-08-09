import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "#imports": fileURLToPath(
        new URL("./packages/test-utils/src/vitest-imports.ts", import.meta.url)
      )
    }
  },
  test: {
    passWithNoTests: false,
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: ["**/node_modules/**", "**/.nuxt/**", "**/.output/**", "**/dist/**"],
    reporters: process.env.GITHUB_ACTIONS ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "cobertura"],
      include: [
        "modules/**/src/**/*.{js,jsx,ts,tsx,vue}",
        "packages/**/src/**/*.{js,jsx,ts,tsx,vue}"
      ],
      exclude: [
        "**/node_modules/**",
        "**/.nuxt/**",
        "**/.output/**",
        "**/dist/**",
        "**/playground/**",
        "**/__tests__/**",
        "**/fixtures/**",
        "**/*.d.ts"
      ]
    }
  }
});
