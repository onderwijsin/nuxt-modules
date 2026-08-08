import { describe, expect, it } from "vitest";
import { storageAdminOptionsSchema } from "../src/config/options.schema";

describe("storageAdminOptionsSchema", () => {
  it("applies the complete safe default configuration", () => {
    expect(storageAdminOptionsSchema.parse({})).toMatchObject({
      enabled: false,
      adminHeaderName: "x-admin-token",
      devAuthBypass: false,
      internalKeyPrefixes: ["__cache_meta:"],
      internalKeySuffixes: ["$"],
      mounts: {},
      ui: { enabled: true, path: "/_storage" },
      defaultLimit: 100,
      maxLimit: 500,
      maxListedKeys: 10_000
    });
  });

  it("accepts an explicitly bounded storage mount", () => {
    expect(
      storageAdminOptionsSchema.parse({
        enabled: true,
        mounts: {
          cache: {
            permissions: ["read", "delete"],
            prefixes: ["kennisbank:articles"]
          }
        }
      })
    ).toMatchObject({
      enabled: true,
      adminHeaderName: "x-admin-token",
      mounts: {
        cache: {
          permissions: ["read", "delete"],
          prefixes: ["kennisbank:articles"],
          allowRoot: false
        }
      }
    });
  });

  it("rejects a mount with neither an allowed root nor a prefix", () => {
    expect(() =>
      storageAdminOptionsSchema.parse({
        mounts: { cache: { permissions: ["read"] } }
      })
    ).toThrow(/allowRoot/);
  });

  it("allows explicit full-mount administration", () => {
    expect(
      storageAdminOptionsSchema.parse({
        mounts: { demo: { permissions: ["read"], allowRoot: true } }
      }).mounts.demo
    ).toMatchObject({ prefixes: [], allowRoot: true });
  });

  it("rejects invalid UI paths and unknown options", () => {
    expect(() => storageAdminOptionsSchema.parse({ ui: { path: "storage" } })).toThrow(
      /must start/
    );
    expect(() => storageAdminOptionsSchema.parse({ unexpected: true })).toThrow();
  });
});
