import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fetch, setup } from "@nuxt/test-utils/e2e";

describe("turnstile module in production", async () => {
  await setup({
    rootDir: fileURLToPath(new URL("./fixtures/production", import.meta.url))
  });

  it("rejects requests when the production secret is missing", async () => {
    const response = await fetch("/api/turnstile/validate", {
      method: "POST",
      headers: { "x-turnstile-token": "fixture-success" }
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      data: { code: "TURNSTILE_SERVER_MISCONFIGURED", expectedAction: "fixture" }
    });
  });
});
