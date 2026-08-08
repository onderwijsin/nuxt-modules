import { describe, expect, it } from "vitest";
import { storageAdminOptionsSchema } from "../src/config/options.schema";

describe("storageAdminOptionsSchema", () => {
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
});
