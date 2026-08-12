import { describe, expect, it } from "vitest";

import { parseDirectusCommands } from "../src/config/commands";
import { directusClientOptionsSchema } from "../src/config/options.schema";

describe("Directus module options", () => {
  it("allows enabled modules without a baseUrl", () => {
    expect(directusClientOptionsSchema.parse({})).toMatchObject({ enabled: true, instance: {} });
    expect(
      directusClientOptionsSchema.parse({ client: { typegen: { enabled: false } } })
    ).toMatchObject({
      enabled: true,
      instance: {}
    });
  });

  it("allows disabled modules without a baseUrl", () => {
    expect(directusClientOptionsSchema.parse({ enabled: false })).toMatchObject({
      enabled: false,
      instance: {},
      client: {
        proxy: { path: "/_directus/proxy" },
        commands: ["readItem", "readItems"],
        auth: { enabled: false }
      }
    });
  });

  it("defaults authentication Turnstile protection to disabled", () => {
    expect(
      directusClientOptionsSchema.parse({ client: { auth: { enabled: true } } })
    ).toMatchObject({
      client: { auth: { enabled: true, turnstile: { enabled: false } } }
    });
    expect(
      directusClientOptionsSchema.parse({ client: { auth: { turnstile: { enabled: true } } } })
    ).toMatchObject({
      client: { auth: { turnstile: { enabled: true } } }
    });
  });

  it("defaults every type-generation augmentation to enabled", () => {
    expect(directusClientOptionsSchema.parse({})).toMatchObject({
      client: {
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
      }
    });
  });

  it("rejects root, traversal, and auth-colliding proxy paths", () => {
    for (const path of ["/", "/../proxy", "/_directus/auth/session"]) {
      expect(() => directusClientOptionsSchema.parse({ client: { proxy: { path } } })).toThrow();
    }
  });

  it("rejects non-local proxy paths", () => {
    expect(() =>
      directusClientOptionsSchema.parse({ client: { proxy: { path: "https://example.test" } } })
    ).toThrow();
  });

  it("rejects unsupported command names", () => {
    expect(() => parseDirectusCommands(["readItems", "withToken"])).toThrow(/Supported commands/);
  });

  it("uses the shared instance shape and rejects unknown direct module options", () => {
    expect(
      directusClientOptionsSchema.parse({ instance: { baseUrl: "https://directus.example.test" } })
    ).toMatchObject({ instance: { baseUrl: "https://directus.example.test" } });
    expect(() =>
      directusClientOptionsSchema.parse({ baseUrl: "https://directus.example.test" })
    ).toThrow();
    expect(() => directusClientOptionsSchema.parse({ auth: { enabled: true } })).toThrow();
    expect(() =>
      directusClientOptionsSchema.parse({ instance: { baseUrl: "not-a-url" } })
    ).toThrow();
  });
});
