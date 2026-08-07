import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { $fetch, setup } from "@nuxt/test-utils/e2e";

describe("turnstile module", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url))
  });

  it("loads the composable through Nuxt auto-imports", async () => {
    const html = await $fetch("/");

    expect(html).toContain('<p id="turnstile-enabled">true</p>');
  });

  it("allows the configured admin header to bypass validation", async () => {
    await expect(
      $fetch("/api/turnstile/validate", {
        method: "POST",
        headers: { "x-fixture-admin": "fixture-admin-token" }
      })
    ).resolves.toEqual({ ok: true });
  });

  it("allows the configured admin bearer token to bypass validation", async () => {
    await expect(
      $fetch("/api/turnstile/validate", {
        method: "POST",
        headers: { authorization: "Bearer fixture-admin-token" }
      })
    ).resolves.toEqual({ ok: true });
  });

  it("rejects a request without a Turnstile token", async () => {
    await expect($fetch("/api/turnstile/validate", { method: "POST" })).rejects.toMatchObject({
      statusCode: 400
    });
  });
});
