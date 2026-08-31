import { describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture } from "../../../packages/test-utils/src";

async function expectTurnstileError(
  token: string | undefined,
  statusCode: number,
  data: Record<string, string>
) {
  const response = await fetch("/api/turnstile/validate", {
    method: "POST",
    headers: token ? { "x-turnstile-token": token } : undefined
  });

  expect(response.status).toBe(statusCode);
  await expect(response.json()).resolves.toMatchObject({ data });
}

describe("turnstile module", async () => {
  await setupFixture(import.meta.url);

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

  it("auto-imports verifyTokenWithTurnstile for raw server verification", async () => {
    await expect(
      $fetch("/api/turnstile/raw-validate", {
        method: "POST",
        headers: { "x-turnstile-token": "fixture-success" }
      })
    ).resolves.toEqual({ success: true });
  });

  it("rejects a request without a Turnstile token", async () => {
    await expectTurnstileError(undefined, 400, {
      code: "TURNSTILE_TOKEN_MISSING",
      expectedAction: "fixture"
    });
  });

  it("rejects a verifier response with success=false", async () => {
    await expectTurnstileError("fixture-rejected", 403, {
      code: "TURNSTILE_VALIDATION_FAILED",
      expectedAction: "fixture"
    });
  });

  it("rejects a verifier response with a mismatched action", async () => {
    await expectTurnstileError("fixture-action-mismatch", 403, {
      code: "TURNSTILE_ACTION_MISMATCH",
      expectedAction: "fixture"
    });
  });

  it("accepts a verifier response with the matching action", async () => {
    await expect(
      $fetch("/api/turnstile/validate", {
        method: "POST",
        headers: { "x-turnstile-token": "fixture-success" }
      })
    ).resolves.toEqual({ ok: true });
  });

  it("rejects a successful verifier response without an action", async () => {
    await expectTurnstileError("fixture-success-without-action", 403, {
      code: "TURNSTILE_ACTION_MISMATCH",
      expectedAction: "fixture"
    });
  });

  it("accepts a verified Cloudflare test-key response without an action", async () => {
    await expect(
      $fetch("/api/turnstile/validate", {
        method: "POST",
        headers: { "x-turnstile-token": "fixture-testing-key" }
      })
    ).resolves.toEqual({ ok: true });
  });

  it("maps verifier transport failures to 502", async () => {
    await expectTurnstileError("fixture-transport-failure", 502, {
      code: "TURNSTILE_VALIDATION_UNAVAILABLE",
      expectedAction: "fixture"
    });
  });

  it("preserves status-coded verifier errors", async () => {
    const response = await fetch("/api/turnstile/validate", {
      method: "POST",
      headers: { "x-turnstile-token": "fixture-status-error" }
    });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      statusCode: 429,
      statusMessage: "fixture verifier rate limit"
    });
  });

  it("maps malformed verifier responses to 502", async () => {
    await expectTurnstileError("fixture-malformed", 502, {
      code: "TURNSTILE_VALIDATION_UNAVAILABLE",
      expectedAction: "fixture"
    });
  });
});
