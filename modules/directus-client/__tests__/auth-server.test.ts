import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: {
        passwordResetUrl: "https://app.example.test/reset",
        magicLinks: { redirectUrl: "https://app.example.test/magic-link" }
      }
    }
  },
  fetch: vi.fn(),
  createSession: vi.fn(),
  ensureFreshSession: vi.fn(),
  destroySession: vi.fn(),
  establishSession: vi.fn(),
  parseResponse: vi.fn()
}));

vi.mock("nitropack/runtime", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("ofetch", () => ({ ofetch: state.fetch }));
vi.mock("../src/runtime/server/utils/auth", () => ({
  createDirectusSession: state.createSession,
  destroyDirectusSession: state.destroySession,
  ensureFreshDirectusSession: state.ensureFreshSession,
  establishDirectusSession: state.establishSession,
  parseDirectusAuthenticationResponse: state.parseResponse
}));

const {
  loginServer,
  refreshServer,
  logoutServer,
  requestPasswordResetServer,
  resetPasswordServer,
  requestMagicLinkServer,
  redeemMagicLinkServer
} = await import("../src/runtime/server/utils/auth-server");

const snapshot = {
  userId: "user-1",
  email: "user@example.test",
  firstName: "Test",
  lastName: "User",
  requiresTfaSetup: false
};

beforeEach(() => {
  state.fetch.mockReset();
  state.createSession.mockReset();
  state.ensureFreshSession.mockReset();
  state.destroySession.mockReset();
  state.establishSession.mockReset();
  state.parseResponse.mockReset();
});

describe("server authentication operations", () => {
  it("creates a session from login credentials", async () => {
    state.createSession.mockResolvedValue({ snapshot });
    const event = createTestEvent();
    const input = { email: "user@example.test", password: "password", otp: "123456" };

    await expect(loginServer(event, input)).resolves.toEqual(snapshot);
    expect(state.createSession).toHaveBeenCalledWith(event, input);
  });

  it("returns a refreshed session snapshot", async () => {
    state.ensureFreshSession.mockResolvedValue({ snapshot });
    const event = createTestEvent();

    await expect(refreshServer(event)).resolves.toEqual(snapshot);
    expect(state.ensureFreshSession).toHaveBeenCalledWith(event);
  });

  it("rejects refresh when the session is invalid", async () => {
    state.ensureFreshSession.mockResolvedValue(undefined);

    await expect(refreshServer(createTestEvent())).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: "Directus session is invalid"
    });
  });

  it("destroys the current session", async () => {
    const event = createTestEvent();

    await expect(logoutServer(event)).resolves.toBeUndefined();
    expect(state.destroySession).toHaveBeenCalledWith(event);
  });

  it("requests a password reset using the configured reset URL", async () => {
    const event = createTestEvent();

    await expect(requestPasswordResetServer(event, "user@example.test")).resolves.toBeUndefined();
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/password/request",
      expect.objectContaining({
        method: "POST",
        body: {
          email: "user@example.test",
          reset_url: "https://app.example.test/reset"
        }
      })
    );
  });

  it("resets a password through Directus", async () => {
    const event = createTestEvent();

    await expect(
      resetPasswordServer(event, "reset-token", "new-password")
    ).resolves.toBeUndefined();
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/password/reset",
      expect.objectContaining({
        method: "POST",
        body: { token: "reset-token", password: "new-password" }
      })
    );
  });

  it("requests a magic link using the configured redirect URL", async () => {
    const event = createTestEvent();

    await expect(requestMagicLinkServer(event, "user@example.test")).resolves.toBeUndefined();
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/magic-links/request",
      expect.objectContaining({
        method: "POST",
        body: {
          email: "user@example.test",
          redirectUrl: "https://app.example.test/magic-link"
        }
      })
    );
  });

  it("redeems a magic link and establishes a session", async () => {
    const event = createTestEvent();
    const authentication = { accessToken: "access", refreshToken: "refresh" };
    state.fetch.mockResolvedValue({ data: { access_token: "access", refresh_token: "refresh" } });
    state.parseResponse.mockReturnValue(authentication);
    state.establishSession.mockResolvedValue({ snapshot });

    await expect(redeemMagicLinkServer(event, "magic-token", "123456")).resolves.toEqual(snapshot);
    expect(state.fetch).toHaveBeenCalledWith(
      "https://directus.example.test/auth/magic-links/redeem",
      expect.objectContaining({
        method: "POST",
        body: { token: "magic-token", otp: "123456", mode: "json" }
      })
    );
    expect(state.parseResponse).toHaveBeenCalledWith({
      data: { access_token: "access", refresh_token: "refresh" }
    });
    expect(state.establishSession).toHaveBeenCalledWith(event, authentication);
  });
});
