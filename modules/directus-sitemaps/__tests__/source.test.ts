import { describe, expect, it } from "vitest";

import type { DirectusCollectionConfig } from "@onderwijsin/nuxt-directus-config/schema";
import { applyOverridesToCollectionConfig } from "@onderwijsin/nuxt-directus-config/config";

import { generateDirectusSitemapsConfigSource } from "../src/config/source";

describe("Directus sitemap server config source", () => {
  it("loads executable collection configuration from the server-only shared alias", () => {
    expect(generateDirectusSitemapsConfigSource([], [{ loc: "/about" }], true)).toContain(
      'import directusConfig from "#directus-config-server";'
    );
  });

  it("keeps static entries available without the optional config module", () => {
    expect(generateDirectusSitemapsConfigSource([], [{ loc: "/about" }], false)).toBe(
      'export default { collections: [], static: [{"loc":"/about"}], queryLimit: 100, failureMode: "best-effort" };\n'
    );
  });

  it("emits an empty static list when no static entries are configured", () => {
    expect(generateDirectusSitemapsConfigSource([], [], false)).toBe(
      'export default { collections: [], static: [], queryLimit: 100, failureMode: "best-effort" };\n'
    );
  });

  it("merges collection overrides by name and preserves executable shared behavior", () => {
    const mapper = () => ({ loc: "/articles" });
    const collections: DirectusCollectionConfig[] = [
      {
        collection: "articles",
        sitemap: { mapper, fields: ["slug"], _sitemap: "content" },
        prerender: false
      }
    ];
    const overrides: DirectusCollectionConfig[] = [
      { collection: "articles", sitemap: { fields: ["permalink"] }, prerender: false }
    ];
    expect(applyOverridesToCollectionConfig(collections, overrides, "sitemap")).toEqual([
      {
        collection: "articles",
        sitemap: { mapper, fields: ["permalink"], _sitemap: "content" },
        prerender: false
      }
    ]);
  });

  it("lets a false sitemap override disable an existing collection", () => {
    const collections: DirectusCollectionConfig[] = [
      { collection: "articles", sitemap: { _sitemap: "content" }, prerender: false }
    ];
    const overrides: DirectusCollectionConfig[] = [
      { collection: "articles", sitemap: false, prerender: false }
    ];
    expect(applyOverridesToCollectionConfig(collections, overrides, "sitemap")).toEqual([
      { collection: "articles", sitemap: false, prerender: false }
    ]);
  });
});
