import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  body: {} as Record<string, string>,
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: {
        passwordResetUrl: "https://app.example.test/reset",
        magicLinks: { redirectUrl: "https://app.example.test/auth/magic-link" }
      }
    }
  },
  fetch: vi.fn(async () => undefined),
  session: vi.fn(async (_event: unknown, input: unknown) => ({ snapshot: { input } })),
  establish: vi.fn(async (_event: unknown, input: unknown) => ({ snapshot: { input } })),
  parse: vi.fn(() => ({ accessToken: "access", refreshToken: "refresh" })),
  turnstile: vi.fn()
}));

vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  createEvent: () => ({}),
  readValidatedBody: async (_event: unknown, validator: (body: unknown) => unknown) => {
    try {
      return validator(state.body);
    } catch (error) {
      throw Object.assign(new Error("Bad Request"), { cause: error, statusCode: 400 });
    }
  }
}));
vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("nitropack/runtime", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("ofetch", () => ({ ofetch: state.fetch }));
vi.mock("../src/runtime/server/utils/auth", () => ({
  createDirectusSession: state.session,
  establishDirectusSession: state.establish,
  parseDirectusAuthenticationResponse: state.parse
}));
vi.mock("../src/runtime/server/utils/csrf", () => ({ assertDirectusEventSameOrigin: vi.fn() }));
vi.mock("../src/runtime/server/utils/turnstile", () => ({
  assertDirectusTurnstile: state.turnstile
}));

import loginHandler from "../src/runtime/server/handlers/auth/login.post";
import passwordRequestHandler from "../src/runtime/server/handlers/auth/password-request.post";
import passwordResetHandler from "../src/runtime/server/handlers/auth/password-reset.post";
import magicLinkRequestHandler from "../src/runtime/server/handlers/auth/magic-links/request.post";
import magicLinkRedeemHandler from "../src/runtime/server/handlers/auth/magic-links/redeem.post";

function loadHandler(
  name: "login" | "password-request" | "password-reset" | "magic-link-request" | "magic-link-redeem"
) {
  return {
    login: loginHandler,
    "password-request": passwordRequestHandler,
    "password-reset": passwordResetHandler,
    "magic-link-request": magicLinkRequestHandler,
    "magic-link-redeem": magicLinkRedeemHandler
  }[name];
}

beforeEach(() => {
  state.body = {};
  state.fetch.mockClear();
  state.session.mockClear();
  state.establish.mockClear();
  state.parse.mockClear();
  state.turnstile.mockClear();
});

describe("Directus authentication input limits", () => {
  it("accepts login values at their maximum lengths", async () => {
    state.body = {
      email: `${"a".repeat(1011)}@example.test`,
      password: "p".repeat(512),
      otp: "1".repeat(6)
    };
    const handler = await loadHandler("login");

    await expect(handler(createTestEvent())).resolves.toEqual({ input: state.body });
    expect(state.session).toHaveBeenCalledWith(expect.anything(), state.body);
  });

  it.each([
    ["email", { email: "a".repeat(1025), password: "password" }],
    ["password", { email: "user@example.test", password: "p".repeat(513) }],
    ["OTP", { email: "user@example.test", password: "password", otp: "1".repeat(7) }]
  ])("rejects an oversized login %s", async (_field, body) => {
    state.body = body;
    const handler = await loadHandler("login");

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(state.session).not.toHaveBeenCalled();
  });

  it("accepts a password request email at its maximum length", async () => {
    state.body = { email: `${"a".repeat(1011)}@example.test` };
    const handler = await loadHandler("password-request");

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
    expect(state.fetch).toHaveBeenCalled();
  });

  it("rejects an oversized password request email", async () => {
    state.body = { email: "a".repeat(1025) };
    const handler = await loadHandler("password-request");

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("accepts password reset values at their maximum lengths", async () => {
    state.body = { token: "t".repeat(1024), password: "p".repeat(512) };
    const handler = await loadHandler("password-reset");

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
    expect(state.fetch).toHaveBeenCalled();
  });

  it.each([
    ["token", { token: "t".repeat(1025), password: "password" }],
    ["new password", { token: "token", password: "p".repeat(513) }]
  ])("rejects an oversized password reset %s", async (_field, body) => {
    state.body = body;
    const handler = await loadHandler("password-reset");

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(state.fetch).not.toHaveBeenCalled();
  });

  it("requests a magic link with the configured redirect URL", async () => {
    state.body = { email: "user@example.test", redirectUrl: "https://attacker.example.test" };
    state.config.directusClient.auth.magicLinks = {
      redirectUrl: "https://app.example.test/auth/magic-link"
    };
    const handler = await loadHandler("magic-link-request");

    await expect(handler(createTestEvent())).resolves.toBeUndefined();
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/magic-links/request",
      expect.objectContaining({
        body: {
          email: "user@example.test",
          redirectUrl: "https://app.example.test/auth/magic-link"
        }
      })
    );
    expect(state.turnstile).toHaveBeenCalledWith(expect.anything(), "magicLinkRequest");
  });

  it("redeems a magic link in JSON mode and establishes the normal session", async () => {
    state.body = { magicLinkToken: "magic-token", otp: "123456" };
    state.fetch.mockResolvedValue({
      data: { access_token: "access", refresh_token: "refresh" }
    });
    const handler = await loadHandler("magic-link-redeem");

    await expect(handler(createTestEvent())).resolves.toEqual({
      input: { accessToken: "access", refreshToken: "refresh" }
    });
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/magic-links/redeem",
      expect.objectContaining({
        body: { token: "magic-token", otp: "123456", mode: "json" }
      })
    );
    expect(state.establish).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "access",
      refreshToken: "refresh"
    });
    expect(state.turnstile).not.toHaveBeenCalled();
  });

  it.each([
    ["magic-link email", "magic-link-request", { email: "a".repeat(1025) }],
    ["magic-link token", "magic-link-redeem", { magicLinkToken: "t".repeat(1025) }],
    ["magic-link OTP", "magic-link-redeem", { magicLinkToken: "token", otp: "1".repeat(7) }]
  ] as const)("rejects an oversized %s", async (_field, name, body) => {
    state.body = body;
    const handler = await loadHandler(name);

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(state.fetch).not.toHaveBeenCalled();
    expect(state.establish).not.toHaveBeenCalled();
  });
});
