import { describe, expect, it } from "vitest";
import { fetch, setupFixture } from "../../../packages/test-utils/src";

describe("turnstile module in production", async () => {
  await setupFixture(import.meta.url, "production");

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
