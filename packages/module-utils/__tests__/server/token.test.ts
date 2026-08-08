import { describe, expect, it, vi } from "vitest";
import { hasMatchingRequestToken, isAdmin } from "../../src/server/token";

vi.mock("h3", () => ({
  getRequestHeader: (
    event: { node?: { req?: { headers?: Record<string, string> } } },
    name: string
  ) => event.node?.req?.headers?.[name.toLowerCase()]
}));

describe("request token helpers", () => {
  const event = (headers: Record<string, string>) => ({ node: { req: { headers } } }) as never;

  it("matches a configured header token", () => {
    expect(
      hasMatchingRequestToken(event({ "x-admin-token": "secret" }), "secret", "x-admin-token")
    ).toBe(true);
  });

  it("matches bearer tokens case-insensitively", () => {
    expect(
      hasMatchingRequestToken(event({ authorization: "bEaReR secret" }), "secret", "x-admin-token")
    ).toBe(true);
  });

  it("trims configured and supplied tokens", () => {
    expect(
      hasMatchingRequestToken(event({ "x-admin-token": "  secret  " }), " secret ", "x-admin-token")
    ).toBe(true);
  });

  it("rejects missing, empty, malformed, and mismatched tokens", () => {
    expect(hasMatchingRequestToken(event({}), undefined, "x-admin-token")).toBe(false);
    expect(hasMatchingRequestToken(event({}), " ", "x-admin-token")).toBe(false);
    expect(
      hasMatchingRequestToken(event({ authorization: "Basic secret" }), "secret", "x-admin-token")
    ).toBe(false);
    expect(
      hasMatchingRequestToken(event({ authorization: "Bearer" }), "secret", "x-admin-token")
    ).toBe(false);
    expect(isAdmin(event({ authorization: "Bearer wrong" }), "secret", "x-admin-token")).toBe(
      false
    );
  });

  it("supports custom header names", () => {
    expect(
      hasMatchingRequestToken(event({ "x-custom-token": "secret" }), "secret", "x-custom-token")
    ).toBe(true);
  });
});
