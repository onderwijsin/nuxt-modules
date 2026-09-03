import { describe, expect, it } from "vitest";

import { parseDirectusCommands } from "../src/config/commands";
import { directusClientOptionsSchema } from "../src/config/options.schema";

describe("Directus module options", () => {
  it("allows enabled modules without a baseUrl", () => {
    expect(directusClientOptionsSchema.parse({})).toMatchObject({
      enabled: true,
      instance: {},
      client: { assets: { enabled: true, path: "/_directus/assets", publicOnly: false } }
    });
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
      directusClientOptionsSchema.parse({ client: { auth: { enabled: false } } })
    ).toMatchObject({
      client: { auth: { enabled: false, turnstile: { enabled: false } } }
    });
    expect(
      directusClientOptionsSchema.parse({ client: { auth: { turnstile: { enabled: true } } } })
    ).toMatchObject({
      client: { auth: { turnstile: { enabled: true } } }
    });
  });

  it("configures refresh timing and attempts", () => {
    expect(
      directusClientOptionsSchema.parse({
        client: {
          auth: {
            refreshSafetyWindow: 45_000,
            refreshAttempts: 5
          }
        }
      }).client.auth
    ).toMatchObject({
      refreshSafetyWindow: 45_000,
      refreshAttempts: 5
    });
    expect(() =>
      directusClientOptionsSchema.parse({ client: { auth: { refreshAttempts: 0 } } })
    ).toThrow();
    expect(() =>
      directusClientOptionsSchema.parse({ client: { auth: { refreshTokenLifetime: 604_800_000 } } })
    ).toThrow(/Unrecognized key/);
  });

  it("defaults magic links to disabled and validates their dependencies", () => {
    expect(directusClientOptionsSchema.parse({}).client.auth.magicLinks).toEqual({
      enabled: false
    });
    expect(() =>
      directusClientOptionsSchema.parse({
        client: { auth: { magicLinks: { enabled: true } } }
      })
    ).toThrow(/requires client\.auth\.enabled/);
    expect(() =>
      directusClientOptionsSchema.parse({
        client: { auth: { enabled: true, magicLinks: { enabled: true } } }
      })
    ).toThrow(/redirectUrl is required/);
    expect(
      directusClientOptionsSchema.parse({
        client: {
          auth: {
            enabled: true,
            sessionSecret: "a-valid-directus-session-secret-32-chars",
            magicLinks: {
              enabled: true,
              redirectUrl: "https://app.example.test/auth/magic-link"
            }
          }
        }
      }).client.auth.magicLinks
    ).toEqual({ enabled: true, redirectUrl: "https://app.example.test/auth/magic-link" });
  });

  it("defaults playground masking on and validates sealing secrets", () => {
    expect(directusClientOptionsSchema.parse({}).client.auth.maskSecretsInPlayground).toBe(true);
    expect(() =>
      directusClientOptionsSchema.parse({
        client: { auth: { sessionSecret: "too-short", previousSessionSecrets: [] } }
      })
    ).toThrow();
    expect(
      directusClientOptionsSchema.parse({
        client: {
          auth: {
            sessionSecret: "a-valid-directus-session-secret-32-chars",
            previousSessionSecrets: ["another-valid-directus-session-secret-32-chars"]
          }
        }
      }).client.auth.previousSessionSecrets
    ).toHaveLength(1);
    expect(() =>
      directusClientOptionsSchema.parse({ client: { auth: { enabled: true } } })
    ).toThrow(/sessionSecret is required/);
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

  it("validates and defaults the dedicated assets proxy", () => {
    expect(directusClientOptionsSchema.parse({}).client.assets).toEqual({
      enabled: true,
      path: "/_directus/assets",
      publicOnly: false,
      cache: { enabled: false }
    });
    expect(() =>
      directusClientOptionsSchema.parse({ client: { assets: { cache: { enabled: true } } } })
    ).toThrow();
    expect(() =>
      directusClientOptionsSchema.parse({
        client: { assets: { cache: { enabled: true, storage: "assets", maxAge: 0 } } }
      })
    ).toThrow();
    expect(
      directusClientOptionsSchema.parse({
        client: { assets: { cache: { enabled: true, storage: "assets", maxAge: 60 } } }
      }).client.assets.cache
    ).toEqual({
      enabled: true,
      storage: "assets",
      maxAge: 60,
      maxBodySize: 10 * 1024 * 1024,
      swr: false
    });
    expect(() =>
      directusClientOptionsSchema.parse({
        client: { assets: { cache: { enabled: true, storage: "   ", maxAge: 60 } } }
      })
    ).toThrow();
    expect(() =>
      directusClientOptionsSchema.parse({ client: { assets: { path: "/../assets" } } })
    ).toThrow();
    expect(() =>
      directusClientOptionsSchema.parse({ client: { assets: { path: "https://example.test" } } })
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
