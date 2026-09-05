import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";
import type { DirectusSession } from "../src/runtime/auth/server/session";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: { refreshSafetyWindow: 30_000 }
    }
  },
  current: undefined as DirectusSession | undefined,
  storage: { getMount: vi.fn(() => ({ driver: { name: "memory" } })) },
  session: {
    clear: vi.fn(),
    set: vi.fn(),
    seal: vi.fn(),
    readDetails: vi.fn(),
    writeCookie: vi.fn()
  }
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("nitropack/runtime/config", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("nitropack/runtime", () => ({ useStorage: () => state.storage }));
vi.mock("../src/runtime/auth/server/session", () => ({
  clearDirectusSession: state.session.clear,
  getDirectusSession: vi.fn(() => state.current),
  getDirectusSessionDetails: state.session.readDetails,
  sealDirectusSession: state.session.seal,
  setDirectusSession: state.session.set,
  writeDirectusSessionCookie: state.session.writeCookie
}));

const { createDirectusSession, fetchDirectusCurrentUser } =
  await import("../src/runtime/auth/server/authentication");
const { ensureFreshDirectusSession } = await import("../src/runtime/auth/server/refresh");

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
    refreshToken: `old-refresh-${Date.now()}-${Math.random()}`,
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
  state.storage.getMount.mockReturnValue({ driver: { name: "memory" } });
  state.session.clear.mockReset();
  state.session.set.mockReset();
  state.session.seal.mockImplementation(
    async (_event: unknown, session: DirectusSession) => `boop1:${session.refreshToken}`
  );
  state.session.readDetails.mockImplementation(
    async (_event: unknown, options: { sealedValue?: string }) => {
      const refreshToken = (options.sealedValue ?? "").slice("boop1:".length);
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
    }
  );
  state.session.writeCookie.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe("Directus current-user and login boundaries", () => {
  it("validates the current-user envelope and requests only snapshot fields", async () => {
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
    expect(fetch.mock.calls[0]?.[0]).toContain("fields=id,email,first_name,last_name");
  });

  it.each([{ data: {} }, { data: { id: 42 } }, { id: "user-1" }])(
    "rejects malformed current-user response %#",
    async (body) => {
      mockFetch(jsonResponse(body));
      await expect(fetchDirectusCurrentUser(createTestEvent(), "access-token")).rejects.toThrow();
    }
  );

  it("creates a session from validated tokens and current user", async () => {
    const fetch = mockFetch(
      jsonResponse({ data: { access_token: "access", refresh_token: "refresh", expires: 60_000 } }),
      jsonResponse({ data: { id: "user-1", email: "user@example.test" } })
    );
    await expect(
      createDirectusSession(createTestEvent(), {
        email: "user@example.test",
        password: "password",
        otp: "123456"
      })
    ).resolves.toMatchObject({ accessToken: "access", refreshToken: "refresh" });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(state.session.set).toHaveBeenCalled();
  });

  it("rejects malformed login token responses", async () => {
    mockFetch(jsonResponse({ data: { access_token: "only-access" } }));
    await expect(
      createDirectusSession(createTestEvent(), { email: "user@example.test", password: "password" })
    ).rejects.toThrow();
    expect(state.session.set).not.toHaveBeenCalled();
  });
});

describe("Directus memory refresh coordination", () => {
  it("does not inspect storage when no session needs refresh", async () => {
    const fetch = mockFetch(jsonResponse({}));
    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.storage.getMount).not.toHaveBeenCalled();
  });

  it("refreshes an expiring session and writes the rotated cookie", async () => {
    state.current = expiringSession();
    const fetch = mockFetch(
      jsonResponse({ data: { access_token: "new-access", refresh_token: "new-refresh" } })
    );
    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh"
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.session.writeCookie).toHaveBeenCalledWith(expect.anything(), "boop1:new-refresh");
  });

  it("shares one upstream refresh between concurrent callers", async () => {
    state.current = expiringSession();
    let resolveFetch!: (response: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal("fetch", fetch);
    const first = ensureFreshDirectusSession(createTestEvent());
    const second = ensureFreshDirectusSession(createTestEvent());
    await vi.waitFor(() => expect(resolveFetch).toBeTypeOf("function"));
    resolveFetch(
      jsonResponse({ data: { access_token: "new-access", refresh_token: "new-refresh" } })
    );
    const sessions = await Promise.all([first, second]);
    expect(sessions).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.session.writeCookie).toHaveBeenCalledTimes(2);
    expect(sessions).toEqual([
      expect.objectContaining({ refreshToken: "new-refresh" }),
      expect.objectContaining({ refreshToken: "new-refresh" })
    ]);
  });

  it("allows a new attempt after a transient failure result expires", async () => {
    vi.useFakeTimers();
    try {
      state.current = expiringSession();
      const fetch = mockFetch(new Error("temporary Directus failure"));
      await expect(ensureFreshDirectusSession(createTestEvent())).rejects.toMatchObject({
        statusCode: 503
      });
      expect(state.session.clear).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1_001);
      mockFetch(
        jsonResponse({ data: { access_token: "new-access", refresh_token: "new-refresh" } })
      );
      await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toMatchObject({
        refreshToken: "new-refresh"
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears the session for terminal refresh rejection", async () => {
    state.current = expiringSession();
    mockFetch(jsonResponse({ errors: [{ extensions: { code: "INVALID_TOKEN" } }] }, 401));
    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toBeUndefined();
    expect(state.session.clear).toHaveBeenCalled();
  });

  it("preserves the session for transient upstream failures", async () => {
    state.current = expiringSession();
    mockFetch(Object.assign(new Error("upstream failure"), { statusCode: 500 }));
    await expect(ensureFreshDirectusSession(createTestEvent())).rejects.toMatchObject({
      statusCode: 503
    });
    expect(state.session.clear).not.toHaveBeenCalled();
  });
});
