import { describe, expect, it } from "vitest";
import { createDirectusAuthenticationError } from "../src/runtime/auth/server/authentication-error";

describe("Directus authentication error boundary", () => {
  it.each([
    ["INVALID_OTP", 401],
    ["INVALID_CREDENTIALS", 401],
    ["INVALID_TOKEN", 403],
    ["TOKEN_EXPIRED", 403],
    ["FORBIDDEN", 403],
    ["REQUESTS_EXCEEDED", 429]
  ])("preserves %s and its HTTP status without exposing upstream details", (code, statusCode) => {
    const error = createDirectusAuthenticationError({
      statusCode,
      message: "private fetch details",
      data: {
        secret: "private token",
        errors: [{ message: "private user details", extensions: { code, secret: "private token" } }]
      }
    });
    expect(error).toMatchObject({ statusCode, unhandled: false, fatal: false });
    expect(error?.data).toEqual({
      errors: [{ message: expect.any(String), extensions: { code } }]
    });
    expect(JSON.stringify(error)).not.toContain("private");
  });

  it.each([
    new Error("network failure"),
    { statusCode: 500, data: { errors: [{ extensions: { code: "INVALID_OTP" } }] } },
    { statusCode: 401, data: { errors: [{ extensions: { code: "UNKNOWN" } }] } },
    { statusCode: 401, data: { errors: [] } },
    { statusCode: 401, data: { errors: [{ message: "malformed" }] } },
    {
      statusCode: 401,
      data: {
        errors: [{ extensions: { code: "INVALID_OTP" } }, { extensions: { code: "UNKNOWN" } }]
      }
    }
  ])("leaves unexpected or malformed failures private (%#)", (error) => {
    expect(createDirectusAuthenticationError(error)).toBeUndefined();
  });
});
