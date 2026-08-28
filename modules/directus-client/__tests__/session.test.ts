import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = {
  config: {
    directusClient: {
      auth: {
        sessionSecret: "active-directus-session-secret-32-chars",
        previousSessionSecrets: [] as string[],
        cookie: {
          name: "directus_session",
          secure: false,
          sameSite: "lax" as const,
          path: "/",
          maxAge: 2_592_000
        }
      }
    }
  }
};

vi.mock("nitropack/runtime/config", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));

const {
  clearDirectusSession,
  getDirectusSession,
  setDirectusSession,
  DIRECTUS_SESSION_COOKIE_LIMIT
} = await import("../src/runtime/server/utils/session");

const session = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: Date.now() + 60_000,
  snapshot: {
    userId: "user-1",
    email: null,
    firstName: null,
    lastName: null,
    requiresTfaSetup: false
  }
};

function cookieFromEvent(event: ReturnType<typeof createTestEvent>): string {
  const value = event.node.res.getHeader("set-cookie");
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== "string") throw new Error("Cookie not written");
  return first.split(";", 1)[0];
}

function eventWithCookie(cookie: string) {
  const event = createTestEvent();
  event.node.req.headers.cookie = cookie;
  return event;
}

describe("Directus sealed session state", () => {
  it("round trips through H3 authenticated encryption", async () => {
    const writeEvent = createTestEvent();
    await setDirectusSession(writeEvent, session);
    const cookie = cookieFromEvent(writeEvent);
    const [, encodedValue] = cookie.split("=", 2);
    expect(decodeURIComponent(encodedValue)).toMatch(/^boop1:/);

    await expect(getDirectusSession(eventWithCookie(cookie))).resolves.toEqual(session);
  });

  it("uses a fresh ciphertext for identical sessions", async () => {
    const first = createTestEvent();
    const second = createTestEvent();
    await setDirectusSession(first, session);
    await setDirectusSession(second, session);

    expect(cookieFromEvent(first)).not.toBe(cookieFromEvent(second));
  });

  it("rejects tampered and wrong-key cookies", async () => {
    const writeEvent = createTestEvent();
    await setDirectusSession(writeEvent, session);
    const cookie = cookieFromEvent(writeEvent);
    const [name, value] = cookie.split("=");

    await expect(
      getDirectusSession(eventWithCookie(`${name}=${value.slice(0, -1)}x`))
    ).resolves.toBeUndefined();

    state.config.directusClient.auth.sessionSecret = "wrong-directus-session-secret-32-chars";
    await expect(getDirectusSession(eventWithCookie(cookie))).resolves.toBeUndefined();
    state.config.directusClient.auth.sessionSecret = "active-directus-session-secret-32-chars";
  });

  it("rejects expired sealed sessions", async () => {
    state.config.directusClient.auth.cookie.maxAge = 1;
    const writeEvent = createTestEvent();
    await setDirectusSession(writeEvent, session);
    const cookie = cookieFromEvent(writeEvent);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2_000);
    await expect(getDirectusSession(eventWithCookie(cookie))).resolves.toBeUndefined();
    vi.useRealTimers();
    state.config.directusClient.auth.cookie.maxAge = 2_592_000;
  });

  it("rejects sessions whose Directus token expiry has passed", async () => {
    const writeEvent = createTestEvent();
    await setDirectusSession(writeEvent, { ...session, expiresAt: Date.now() - 1 });
    const cookie = cookieFromEvent(writeEvent);

    await expect(getDirectusSession(eventWithCookie(cookie))).resolves.toBeUndefined();
  });

  it("requires an active session secret to seal", async () => {
    const secret = state.config.directusClient.auth.sessionSecret;
    state.config.directusClient.auth.sessionSecret = "";
    await expect(setDirectusSession(createTestEvent(), session)).rejects.toThrow(
      /secret is not configured/
    );
    state.config.directusClient.auth.sessionSecret = secret;
  });

  it("migrates a session sealed with a previous key", async () => {
    state.config.directusClient.auth.sessionSecret = "old-directus-session-secret-32-chars";
    const oldEvent = createTestEvent();
    await setDirectusSession(oldEvent, session);
    const oldCookie = cookieFromEvent(oldEvent);

    state.config.directusClient.auth.sessionSecret = "active-directus-session-secret-32-chars";
    state.config.directusClient.auth.previousSessionSecrets = [
      "old-directus-session-secret-32-chars"
    ];
    const readEvent = eventWithCookie(oldCookie);
    await expect(getDirectusSession(readEvent)).resolves.toEqual(session);
    expect(cookieFromEvent(readEvent)).not.toBe(oldCookie);
    state.config.directusClient.auth.previousSessionSecrets = [];
  });

  it("rejects oversized sealed sessions without truncating them", async () => {
    await expect(
      setDirectusSession(createTestEvent(), {
        ...session,
        snapshot: {
          userId: "user-1",
          email: "x".repeat(4000),
          firstName: null,
          lastName: null,
          requiresTfaSetup: false
        }
      })
    ).rejects.toThrow(/cookie size limit/);
    expect(DIRECTUS_SESSION_COOKIE_LIMIT).toBeLessThan(4096);
  });

  it("clears an invalid cookie", async () => {
    const event = eventWithCookie("directus_session=not-a-session");
    await expect(getDirectusSession(event)).resolves.toBeUndefined();
    expect(event.node.res.getHeader("set-cookie")).toEqual(
      expect.stringContaining("directus_session=")
    );
    clearDirectusSession(event);
  });

  it("rejects legacy unsigned JSON cookies", async () => {
    const legacy = btoa(JSON.stringify(session)).replaceAll("+", "-").replaceAll("/", "_");
    await expect(
      getDirectusSession(eventWithCookie(`directus_session=${legacy}`))
    ).resolves.toBeUndefined();
  });
});
