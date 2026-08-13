import { describe, expect, it } from "vitest";

import {
  generateDirectusSitemapsConfigSource,
  mergeDirectusSitemapCollections
} from "../src/config/source";

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
    expect(
      mergeDirectusSitemapCollections(
        [
          {
            collection: "articles",
            sitemap: { mapper, fields: ["slug"], _sitemap: "content" },
            prerender: false
          }
        ],
        [
          {
            collection: "articles",
            sitemap: { fields: ["permalink"] },
            prerender: false
          }
        ]
      )
    ).toEqual([
      {
        collection: "articles",
        sitemap: { mapper, fields: ["permalink"], _sitemap: "content" },
        prerender: false
      }
    ]);
  });

  it("lets a false sitemap override disable an existing collection", () => {
    expect(
      mergeDirectusSitemapCollections(
        [{ collection: "articles", sitemap: { _sitemap: "content" }, prerender: false }],
        [{ collection: "articles", sitemap: false, prerender: false }]
      )
    ).toEqual([{ collection: "articles", sitemap: false, prerender: false }]);
  });
});
