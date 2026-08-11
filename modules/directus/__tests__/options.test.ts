import { describe, expect, it } from "vitest";

import { parseDirectusCommands } from "../src/config/commands";
import { directusOptionsSchema } from "../src/config/options.schema";

describe("Directus module options", () => {
  it("requires baseUrl when enabled", () => {
    expect(() => directusOptionsSchema.parse({})).toThrow(/required/);
    expect(() => directusOptionsSchema.parse({ typegen: { enabled: false } })).toThrow(/required/);
  });

  it("allows disabled modules without a baseUrl", () => {
    expect(directusOptionsSchema.parse({ enabled: false })).toMatchObject({
      enabled: false,
      baseUrl: "",
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
