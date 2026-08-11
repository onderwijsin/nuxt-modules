import { describe, expect, it } from "vitest";

import { generateDirectusSitemapsConfigSource } from "../src/config/source";

describe("Directus sitemap server config source", () => {
  it("loads executable collection configuration from the server-only shared alias", () => {
    expect(generateDirectusSitemapsConfigSource([{ loc: "/about" }], true)).toContain(
      'import directusConfig from "#directus-config-server";'
    );
  });

  it("keeps static entries available without the optional config module", () => {
    expect(generateDirectusSitemapsConfigSource([{ loc: "/about" }], false)).toBe(
      'export default { collections: [], static: [{"loc":"/about"}] };\n'
    );
  });
});
