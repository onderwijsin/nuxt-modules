import { describe, expect, it } from "vitest";

import { resolveDirectusSessionSecret } from "../src/config/session-secret";

describe("Directus session-secret setup fallback", () => {
  it("keeps an explicit secret in every context", () => {
    expect(
      resolveDirectusSessionSecret({
        configured: "configured-session-secret-32-chars",
        isCI: true,
        isPrepare: true,
        isDevelopment: true
      })
    ).toBe("configured-session-secret-32-chars");
  });

  it("uses the fixed convenience secret only in development", () => {
    const secret = resolveDirectusSessionSecret({
      isCI: false,
      isPrepare: false,
      isDevelopment: true
    });
    expect(secret).toBe("nuxt-directus-development-session-secret-32-chars");
  });

  it.each([
    ["prepare", { isCI: false, isPrepare: true, isDevelopment: false }],
    ["CI", { isCI: true, isPrepare: false, isDevelopment: false }]
  ])("generates an ephemeral secret in %s", (_name, context) => {
    const first = resolveDirectusSessionSecret(context);
    const second = resolveDirectusSessionSecret(context);
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it("does not provide a production fallback", () => {
    expect(
      resolveDirectusSessionSecret({ isCI: false, isPrepare: false, isDevelopment: false })
    ).toBeUndefined();
  });
});
