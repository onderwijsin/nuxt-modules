import { describe, expect, it } from "vitest";

import {
  deserializeDirectusSession,
  DIRECTUS_SESSION_COOKIE_LIMIT,
  serializeDirectusSession,
  type DirectusSession
} from "../src/runtime/server/utils/session";

const session: DirectusSession = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: 2_000,
  snapshot: {
    userId: "user-1"
  }
};

describe("Directus session state", () => {
  it("serializes and validates the bounded cookie payload", () => {
    expect(deserializeDirectusSession(serializeDirectusSession(session))).toEqual(session);
    expect(deserializeDirectusSession("not-a-session")).toBeUndefined();
    expect(DIRECTUS_SESSION_COOKIE_LIMIT).toBeLessThan(4096);
  });

  it("rejects oversized state instead of truncating it", () => {
    expect(() =>
      serializeDirectusSession({
        ...session,
        snapshot: { ...session.snapshot, email: "x".repeat(4000) }
      })
    ).toThrow(/cookie size limit/);
  });
});
