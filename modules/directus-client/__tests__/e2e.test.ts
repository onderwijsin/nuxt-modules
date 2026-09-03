import { createServer } from "node:http";
import { afterAll, describe, expect, it } from "vitest";
import { $fetch, fetch, setupFixture, url } from "../../../packages/test-utils/src";

describe("Directus client and server composables", async () => {
  let loginRequests = 0;
  let refreshRequests = 0;
  const upstream = createServer((request, response) => {
    if (request.url?.startsWith("/items/pages")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: [{ id: "page-1" }] }));
      return;
    }

    if (request.url?.startsWith("/auth/login")) {
      loginRequests += 1;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          data: {
            access_token: `access-${loginRequests}`,
            refresh_token: `refresh-${loginRequests}`,
            expires: 1
          }
        })
      );
      return;
    }

    if (request.url?.startsWith("/auth/refresh")) {
      refreshRequests += 1;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          data: {
            access_token: "refreshed-access",
            refresh_token: "refreshed-refresh",
            expires: 60_000
          }
        })
      );
      return;
    }

    if (request.url?.startsWith("/auth/logout")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({}));
      return;
    }

    if (request.url?.startsWith("/users/me")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ data: { id: "user-1", email: "user@example.test" } }));
      return;
    }

    if (request.url?.startsWith("/auth/password/request")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({}));
      return;
    }

    if (request.url?.startsWith("/auth/password/reset")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({}));
      return;
    }

    if (request.url?.startsWith("/auth/magic-links/request")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({}));
      return;
    }

    if (request.url?.startsWith("/auth/magic-links/redeem")) {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          data: { access_token: "magic-access", refresh_token: "magic-refresh", expires: 60_000 }
        })
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        errors: [{ message: "Not found", extensions: { code: "NOT_FOUND" } }]
      })
    );
  });

  const originalUrl = process.env.DIRECTUS_E2E_URL;
  await new Promise<void>((resolve, reject) => {
    upstream.once("error", reject);
    upstream.listen(0, "127.0.0.1", resolve);
  });

  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("Mock Directus server did not start");
  process.env.DIRECTUS_E2E_URL = `http://127.0.0.1:${address.port}`;

  await setupFixture(import.meta.url, "basic", { dev: false });

  async function loginWithExpiringAccessToken(): Promise<string> {
    const response = await fetch(url("/_directus/auth/login"), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(url("/")).origin,
        "x-turnstile-token": "directus-login"
      },
      body: JSON.stringify({ email: "user@example.test", password: "password" })
    });
    expect(response.status, await response.clone().text()).toBe(200);
    const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    if (!cookie) throw new Error("Login did not write a Directus session cookie");
    await new Promise<void>((resolve) => setTimeout(resolve, 5));
    return cookie;
  }

  afterAll(async () => {
    if (originalUrl === undefined) delete process.env.DIRECTUS_E2E_URL;
    else process.env.DIRECTUS_E2E_URL = originalUrl;
    await new Promise<void>((resolve, reject) => {
      upstream.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("executes useDirectusServer through Nitro", async () => {
    await expect(
      $fetch<{ count: number; firstId: string }>("/api/directus-server")
    ).resolves.toMatchObject({ count: 1, firstId: expect.any(String) });
  });

  it("executes useDirectus during SSR", async () => {
    const html = await $fetch<string>("/");
    expect(html).toContain('<p data-testid="client-ssr-count">1</p>');
    expect(html).toContain('<p data-testid="client-ssr-error"></p>');
  });

  it("refreshes an expired access token during initial SSR bootstrap", async () => {
    const cookie = await loginWithExpiringAccessToken();
    const refreshCount = refreshRequests;

    const response = await fetch(url("/auth-state"), { headers: { cookie } });

    expect(response.status, await response.clone().text()).toBe(200);
    expect(refreshRequests).toBe(refreshCount + 1);
    await expect(response.text()).resolves.toContain(
      '<p data-testid="authenticated-user">user-1</p>'
    );
    const rotatedCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
    expect(rotatedCookie).toBeTruthy();
    expect(rotatedCookie).not.toBe(cookie);
  });

  it.each([
    "/_directus/auth/login",
    "/_directus/auth/refresh",
    "/_directus/auth/logout",
    "/_directus/auth/password-request",
    "/_directus/auth/password-reset",
    "/_directus/auth/magic-links/request",
    "/_directus/auth/magic-links/redeem"
  ])("rejects cross-origin authentication mutations at %s", async (route) => {
    await expect(
      $fetch(route, { method: "POST", headers: { origin: "https://attacker.example.test" } })
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect($fetch(route, { method: "POST" })).rejects.toMatchObject({ statusCode: 403 });
  });

  it("allows a same-origin authentication mutation", async () => {
    await expect(
      $fetch("/_directus/auth/logout", {
        method: "POST",
        headers: { origin: new URL(url("/")).origin }
      })
    ).resolves.toBeUndefined();
  });

  it.each([
    ["/_directus/auth/login", "directus-login"],
    ["/_directus/auth/password-request", "directus-password-request"],
    ["/_directus/auth/magic-links/request", "directus-magic-link-request"]
  ])("requires a Turnstile token for %s", async (route, expectedAction) => {
    const response = await fetch(route, {
      method: "POST",
      headers: { origin: new URL(url("/")).origin }
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      data: { code: "TURNSTILE_TOKEN_MISSING", expectedAction }
    });
  });

  it("accepts Turnstile tokens with the action exposed for each protected route", async () => {
    const headers = { origin: new URL(url("/")).origin };
    const actions = await $fetch<{
      login: string;
      passwordRequest: string;
      magicLinkRequest: string;
    }>("/api/directus-turnstile-actions");
    expect(actions).toEqual({
      login: "directus-login",
      passwordRequest: "directus-password-request",
      magicLinkRequest: "directus-magic-link-request"
    });
    await expect(
      $fetch("/_directus/auth/login", {
        method: "POST",
        body: { email: "user@example.test", password: "password" },
        headers: { ...headers, "x-turnstile-token": actions.login }
      })
    ).resolves.toMatchObject({ userId: "user-1" });
    await expect(
      $fetch("/_directus/auth/password-request", {
        method: "POST",
        body: { email: "user@example.test" },
        headers: { ...headers, "x-turnstile-token": actions.passwordRequest }
      })
    ).resolves.toEqual({ success: true });
    await expect(
      $fetch("/_directus/auth/magic-links/request", {
        method: "POST",
        body: { email: "user@example.test", redirectUrl: "https://attacker.example.test" },
        headers: { ...headers, "x-turnstile-token": actions.magicLinkRequest }
      })
    ).resolves.toBeUndefined();
  });

  it("redeems a magic link into the normal cookie session", async () => {
    await expect(
      $fetch("/_directus/auth/magic-links/redeem", {
        method: "POST",
        body: { magicLinkToken: "raw-token", otp: "123456" },
        headers: { origin: new URL(url("/")).origin }
      })
    ).resolves.toMatchObject({ userId: "user-1", requiresTfaSetup: false });
  });
});
