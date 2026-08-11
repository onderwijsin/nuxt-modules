import { describe, expect, it } from "vitest";

import { parseDirectusCommands } from "../src/config/commands";
import { directusOptionsSchema } from "../src/config/options.schema";

describe("Directus module options", () => {
  it("allows enabled modules without a baseUrl", () => {
    expect(directusOptionsSchema.parse({})).toMatchObject({ enabled: true, baseUrl: "" });
    expect(directusOptionsSchema.parse({ typegen: { enabled: false } })).toMatchObject({
      enabled: true,
      baseUrl: ""
    });
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

  it("defaults authentication Turnstile protection to disabled", () => {
    expect(directusOptionsSchema.parse({ auth: { enabled: true } })).toMatchObject({
      auth: { enabled: true, turnstile: { enabled: false } }
    });
    expect(directusOptionsSchema.parse({ auth: { turnstile: { enabled: true } } })).toMatchObject({
      auth: { turnstile: { enabled: true } }
    });
  });

  it("defaults every type-generation augmentation to enabled", () => {
    expect(directusOptionsSchema.parse({})).toMatchObject({
      typegen: {
        augmentations: {
          removeEnums: true,
          replaceAnyWithUnknown: true,
          replaceJsonWithJSON: true,
          applyTypeNameOverrides: true,
          makeNonNullableOptionalsRequired: true,
          mergeJsDocs: true
        }
      }
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
