import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  body: {} as Record<string, string>,
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: { passwordResetUrl: "https://app.example.test/reset" }
    }
  },
  fetch: vi.fn(async () => undefined),
  session: vi.fn(async (_event: unknown, input: unknown) => ({ snapshot: { input } }))
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
vi.mock("ofetch", () => ({ ofetch: state.fetch }));
vi.mock("../src/runtime/server/utils/auth", () => ({ createDirectusSession: state.session }));
vi.mock("../src/runtime/server/utils/csrf", () => ({ assertDirectusEventSameOrigin: vi.fn() }));
vi.mock("../src/runtime/server/utils/turnstile", () => ({ assertDirectusTurnstile: vi.fn() }));

import loginHandler from "../src/runtime/server/handlers/auth/login.post";
import passwordRequestHandler from "../src/runtime/server/handlers/auth/password-request.post";
import passwordResetHandler from "../src/runtime/server/handlers/auth/password-reset.post";

function loadHandler(name: "login" | "password-request" | "password-reset") {
  return {
    login: loginHandler,
    "password-request": passwordRequestHandler,
    "password-reset": passwordResetHandler
  }[name];
}

beforeEach(() => {
  state.body = {};
  state.fetch.mockClear();
  state.session.mockClear();
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
});
