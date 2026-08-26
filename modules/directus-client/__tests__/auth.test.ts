import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hash } from "ohash";

import { createTestEvent } from "../../../packages/test-utils/src";
import type { DirectusSession } from "../src/runtime/server/utils/session";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: { refreshSafetyWindow: 30_000 }
    }
  },
  current: undefined as DirectusSession | undefined,
  storage: {
    records: new Map<string, unknown>(),
    getItem: vi.fn(),
    setItem: vi.fn()
  },
  session: {
    clear: vi.fn(),
    set: vi.fn(),
    seal: vi.fn(),
    readDetails: vi.fn(),
    writeCookie: vi.fn()
  }
}));

vi.mock("#imports", () => ({
  useRuntimeConfig: () => state.config
}));

vi.mock("nitropack/runtime", () => ({
  useStorage: () => state.storage
}));

vi.mock("../src/runtime/server/utils/session", () => ({
  clearDirectusSession: state.session.clear,
  getDirectusSession: vi.fn(() => state.current),
  getDirectusSessionDetails: state.session.readDetails,
  sealDirectusSession: state.session.seal,
  setDirectusSession: state.session.set,
  writeDirectusSessionCookie: state.session.writeCookie
}));

const {
  createDirectusSession,
  destroyDirectusSession,
  ensureFreshDirectusSession,
  fetchDirectusCurrentUser
} = await import("../src/runtime/server/utils/auth");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function mockFetch(...responses: (Response | Error)[]) {
  const fetch = vi.fn(async () => {
    const response = responses.shift();
    if (response instanceof Error) throw response;
    if (!response) throw new Error("No queued response");
    return response;
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function expiringSession(): DirectusSession {
  return {
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: Date.now() + 1,
    snapshot: {
      userId: "user-1",
      email: null,
      firstName: null,
      lastName: null,
      requiresTfaSetup: false
    }
  };
}

beforeEach(() => {
  state.current = undefined;
  state.storage.records.clear();
  state.storage.getItem.mockImplementation(async (key: string) => state.storage.records.get(key));
  state.storage.setItem.mockImplementation(async (key: string, value: unknown) => {
    state.storage.records.set(key, value);
  });
  state.session.clear.mockReset();
  state.session.set.mockReset();
  state.session.seal.mockImplementation(
    async (_event: unknown, session: DirectusSession) => `boop1:${session.refreshToken}`
  );
  state.session.readDetails.mockImplementation(async (_event: unknown, sealed: string) => {
    const refreshToken = sealed.slice("boop1:".length);
    return {
      session: {
        accessToken: refreshToken === "stored-refresh" ? "stored-access" : "new-access",
        refreshToken,
        expiresAt: Date.now() + 60_000,
        snapshot: {
          userId: "user-1",
          email: null,
          firstName: null,
          lastName: null,
          requiresTfaSetup: false
        }
      },
      matchedSecretSlot: "active"
    };
  });
  state.session.writeCookie.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Directus current-user and login boundaries", () => {
  it("validates the Directus current-user envelope and requests only snapshot fields", async () => {
    const fetch = mockFetch(
      jsonResponse({
        data: {
          id: "user-1",
          email: "user@example.test",
          first_name: "Test",
          last_name: "User",
          role: "must-not-be-persisted"
        }
      })
    );

    await expect(fetchDirectusCurrentUser(createTestEvent(), "access-token")).resolves.toEqual({
      userId: "user-1",
      email: "user@example.test",
      firstName: "Test",
      lastName: "User",
      requiresTfaSetup: false
    });
    expect(fetch.mock.calls[0]?.[0]).toContain("users/me");
    expect(fetch.mock.calls[0]?.[0]).toContain("fields=id,email,first_name,last_name");
  });

  it.each([{ data: {} }, { data: { id: 42 } }, { id: "user-1" }])(
    "rejects malformed current-user response %#",
    async (body) => {
      mockFetch(jsonResponse(body));
      await expect(fetchDirectusCurrentUser(createTestEvent(), "access-token")).rejects.toThrow();
    }
  );

  it("creates a session from validated tokens and the validated current user", async () => {
    const fetch = mockFetch(
      jsonResponse({ data: { access_token: "access", refresh_token: "refresh", expires: 60_000 } }),
      jsonResponse({ data: { id: "user-1", email: "user@example.test" } })
    );

    const session = await createDirectusSession(createTestEvent(), {
      email: "user@example.test",
      password: "password",
      otp: "123456"
    });

    expect(session).toMatchObject({
      accessToken: "access",
      refreshToken: "refresh",
      snapshot: {
        userId: "user-1",
        email: "user@example.test",
        firstName: null,
        lastName: null,
        requiresTfaSetup: false
      }
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.session.set).toHaveBeenCalledWith(expect.anything(), session);
  });

  it("projects the enforce_tfa claim into the safe session snapshot", async () => {
    const payload = btoa(JSON.stringify({ enforce_tfa: true }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    const fetch = mockFetch(
      jsonResponse({
        data: {
          access_token: `header.${payload}.signature`,
          refresh_token: "refresh"
        }
      }),
      jsonResponse({ data: { id: "user-1" } })
    );

    await expect(
      createDirectusSession(createTestEvent(), {
        email: "user@example.test",
        password: "password"
      })
    ).resolves.toMatchObject({ snapshot: { requiresTfaSetup: true } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed login token responses without creating a session", async () => {
    mockFetch(jsonResponse({ data: { access_token: "only-access" } }));
    await expect(
      createDirectusSession(createTestEvent(), { email: "user@example.test", password: "password" })
    ).rejects.toThrow();
    expect(state.session.set).not.toHaveBeenCalled();
  });
});

describe("Directus session refresh coordination", () => {
  it("returns no session when the request has no cookie session", async () => {
    const fetch = mockFetch(jsonResponse({}));
    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.storage.getItem).not.toHaveBeenCalled();
  });

  it("returns a session that is outside the refresh safety window", async () => {
    const current = { ...expiringSession(), expiresAt: Date.now() + 60_000 };
    state.current = current;
    const fetch = mockFetch(jsonResponse({}));

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBe(current);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refreshes an expiring session and publishes the completed flight", async () => {
    state.current = expiringSession();
    state.session.seal.mockResolvedValue("boop1:opaque-ciphertext");
    const fetch = mockFetch(
      jsonResponse({ data: { access_token: "new-access", refresh_token: "new-refresh" } }),
      jsonResponse({ data: { id: "user-1", last_name: "User" } })
    );

    const session = await ensureFreshDirectusSession(createTestEvent());

    expect(session).toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      snapshot: {
        userId: "user-1",
        email: null,
        firstName: null,
        lastName: "User",
        requiresTfaSetup: false
      }
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.storage.setItem).toHaveBeenCalledWith(
      expect.stringContaining("flight:"),
      expect.objectContaining({ status: "completed", sealedSession: expect.any(String) }),
      { ttl: 5_000 }
    );
    const stored = state.storage.setItem.mock.calls[1]?.[1];
    expect(stored).toEqual({ status: "completed", sealedSession: "boop1:opaque-ciphertext" });
    expect(JSON.stringify(stored)).not.toContain("new-access");
    expect(JSON.stringify(stored)).not.toContain("new-refresh");
  });

  it("waits for a completed refresh published by shared storage", async () => {
    state.current = expiringSession();
    const key = "flight:" + hash(state.current.refreshToken);
    state.storage.records.set(key, {
      status: "pending",
      owner: "other-instance",
      startedAt: Date.now()
    });
    const fetch = mockFetch(jsonResponse({}));
    setTimeout(() => {
      state.storage.records.set(key, {
        status: "completed",
        sealedSession: "boop1:stored-refresh"
      });
    }, 5);

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toMatchObject({
      accessToken: "stored-access",
      refreshToken: "stored-refresh"
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the session and publishes failure when refresh fails", async () => {
    state.current = expiringSession();
    mockFetch(new Error("Directus unavailable"));

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(state.session.clear).toHaveBeenCalled();
    expect([...state.storage.records.values()]).toContainEqual({ status: "failed" });
  });

  it("uses a completed refresh result already in storage", async () => {
    state.current = expiringSession();
    const completed: DirectusSession = {
      accessToken: "stored-access",
      refreshToken: "stored-refresh",
      expiresAt: Date.now() + 60_000,
      snapshot: {
        userId: "user-1",
        email: null,
        firstName: null,
        lastName: null,
        requiresTfaSetup: false
      }
    };
    state.storage.records.set("flight:" + hash(state.current.refreshToken), {
      status: "completed",
      sealedSession: "boop1:stored-refresh"
    });
    const fetch = mockFetch(jsonResponse({}));

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toMatchObject({
      accessToken: completed.accessToken,
      refreshToken: completed.refreshToken,
      snapshot: completed.snapshot
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(state.session.writeCookie).toHaveBeenCalledWith(
      expect.anything(),
      "boop1:stored-refresh"
    );
  });

  it("stops immediately when storage reports a failed refresh flight", async () => {
    state.current = expiringSession();
    state.storage.records.set("flight:" + hash(state.current.refreshToken), { status: "failed" });
    const fetch = mockFetch(jsonResponse({}));

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.session.clear).toHaveBeenCalled();
  });
});

describe("Directus logout cleanup", () => {
  it("clears a local session even when Directus logout fails", async () => {
    state.current = expiringSession();
    mockFetch(new Error("Directus unavailable"));

    await expect(destroyDirectusSession(createTestEvent())).rejects.toThrow("Directus unavailable");
    expect(state.session.clear).toHaveBeenCalled();
  });

  it("clears a local session without contacting Directus when already signed out", async () => {
    const fetch = mockFetch(jsonResponse({}));
    await expect(destroyDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.session.clear).toHaveBeenCalled();
  });
});
