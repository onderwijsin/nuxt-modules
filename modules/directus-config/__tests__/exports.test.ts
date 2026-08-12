import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

describe("directus-config package exports", () => {
  it("resolves public entrypoints through CommonJS-compatible resolution", () => {
    expect(require.resolve("@onderwijsin/nuxt-directus-config")).toContain("dist/module.mjs");
    expect(require.resolve("@onderwijsin/nuxt-directus-config/config")).toContain(
      "dist/config/index.mjs"
    );
    expect(require.resolve("@onderwijsin/nuxt-directus-config/schema")).toContain(
      "dist/schema/index.mjs"
    );
  });
});
