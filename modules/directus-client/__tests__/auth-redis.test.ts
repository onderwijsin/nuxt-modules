import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";
import { FakeRedis } from "./fixtures/fake-redis";

import type { DirectusSession } from "../src/runtime/auth/server/session";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test/",
      auth: { refreshSafetyWindow: 30_000 }
    }
  },
  current: undefined as DirectusSession | undefined,
  storage: { getMount: vi.fn() },
  session: {
    clear: vi.fn(),
    seal: vi.fn(),
    readDetails: vi.fn(),
    writeCookie: vi.fn()
  }
}));

let redis: FakeRedis;

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("nitropack/runtime/config", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("nitropack/runtime", () => ({ useStorage: () => state.storage }));
vi.mock("../src/runtime/auth/server/session", () => ({
  clearDirectusSession: state.session.clear,
  getDirectusSession: vi.fn(() => state.current),
  getDirectusSessionDetails: state.session.readDetails,
  sealDirectusSession: state.session.seal,
  writeDirectusSessionCookie: state.session.writeCookie
}));

import { ensureFreshDirectusSession } from "../src/runtime/auth/server/refresh";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function expiringSession(): DirectusSession {
  return {
    accessToken: "old-access",
    refreshToken: "redis-publication-refresh",
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
  redis = new FakeRedis();
  state.current = expiringSession();
  state.storage.getMount.mockReturnValue({
    driver: {
      name: "redis",
      options: { base: "configured" },
      getInstance: () => redis
    }
  });
  state.session.clear.mockReset();
  state.session.seal.mockResolvedValue("boop1:new-refresh");
  state.session.readDetails.mockReset();
  state.session.writeCookie.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      jsonResponse({ data: { access_token: "new-access", refresh_token: "new-refresh" } })
    )
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("Directus Redis refresh coordination at the auth boundary", () => {
  it("keeps a successful local refresh when Redis publication fails", async () => {
    redis.failNextResultPublication = true;

    await expect(ensureFreshDirectusSession(createTestEvent())).resolves.toMatchObject({
      accessToken: "new-access",
      refreshToken: "new-refresh"
    });
    expect(state.session.clear).not.toHaveBeenCalled();
    expect(state.session.writeCookie).toHaveBeenCalledWith(expect.anything(), "boop1:new-refresh");
    expect([...redis.records.keys()].some((key) => key.endsWith(":lease"))).toBe(true);
  });
});
