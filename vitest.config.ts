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
    passWithNoTests: true,
    include: ["**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    exclude: ["**/node_modules/**", "**/.nuxt/**", "**/.output/**", "**/dist/**"]
  }
});
