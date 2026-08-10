import { describe, expect, it } from "vitest";

import { parseDirectusCommands } from "../src/config/commands";
import { directusOptionsSchema } from "../src/config/options.schema";

describe("Directus module options", () => {
  it("applies safe defaults", () => {
    expect(directusOptionsSchema.parse({})).toMatchObject({
      enabled: true,
      proxy: { path: "/_directus/proxy" },
      commands: ["readItem", "readItems"],
      auth: { enabled: false }
    });
  });

  it("rejects root, traversal, and auth-colliding proxy paths", () => {
    for (const path of ["/", "/../proxy", "/_directus/auth/session"]) {
      expect(() => directusOptionsSchema.parse({ proxy: { path } })).toThrow();
    }
  });

  it("rejects non-local proxy paths", () => {
    expect(() =>
      directusOptionsSchema.parse({ proxy: { path: "https://example.test" } })
    ).toThrow();
  });

  it("rejects unsupported command names", () => {
    expect(() => parseDirectusCommands(["readItems", "withToken"])).toThrow(/Supported commands/);
  });
});
