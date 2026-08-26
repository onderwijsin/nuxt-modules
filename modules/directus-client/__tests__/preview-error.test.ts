import { describe, expect, it } from "vitest";

import { useDirectusError } from "../src/runtime/app/composables/directus-error";
import { parseDirectusPreviewContext } from "../src/runtime/utils/preview";

const preview = {
  enabled: true,
  versioning: true,
  queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
};

describe("Directus preview context", () => {
  it("accepts preview tokens and named versions, but omits main", () => {
    expect(
      parseDirectusPreviewContext(
        { preview: "true", token: "preview-token", version: "draft", id: "page-1" },
        preview
      )
    ).toEqual({
      isPreview: true,
      token: "preview-token",
      version: "draft",
      id: "page-1"
    });
    expect(parseDirectusPreviewContext({ preview: "true", version: "main" }, preview)).toEqual({
      isPreview: true
    });
  });

  it("rejects arrays, invalid versions, and disabled preview values", () => {
    expect(parseDirectusPreviewContext({ preview: ["true"], token: "secret" }, preview)).toEqual({
      isPreview: false
    });
    expect(
      parseDirectusPreviewContext({ preview: "true", version: "draft/../main" }, preview)
    ).toEqual({ isPreview: true });
    expect(
      parseDirectusPreviewContext(
        { preview: "true", token: "secret", version: "draft" },
        { ...preview, versioning: false }
      )
    ).toEqual({ isPreview: true, token: "secret" });
    expect(
      parseDirectusPreviewContext(
        { preview: "true", token: "secret" },
        { ...preview, enabled: false }
      )
    ).toEqual({ isPreview: false });
  });
});

describe("Directus error normalization", () => {
  it("preserves all SDK errors and supports extension-defined codes", () => {
    const result = useDirectusError({
      statusCode: 401,
      data: {
        errors: [
          { message: "otp required", extensions: { code: "INVALID_OTP", reason: "mfa" } },
          { message: "custom", extensions: { code: "MY_EXTENSION_CODE", value: 3 } }
        ]
      }
    });
    expect(result).toMatchObject({
      isDirectusError: true,
      statusCode: 401,
      isOtpError: true,
      isInvalidCredentialError: false
    });
    if (result.isDirectusError) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors[1]?.code).toBe("MY_EXTENSION_CODE");
    }
  });

  it("recognizes common UI error codes and keeps unknown codes extensible", () => {
    const result = useDirectusError({
      errors: [
        { message: "denied", extensions: { code: "FORBIDDEN" } },
        { message: "invalid", extensions: { code: "FAILED_VALIDATION" } },
        { message: "custom", extensions: { code: "CUSTOM_EXTENSION" } }
      ]
    });

    expect(result).toMatchObject({
      isDirectusError: true,
      isForbiddenError: true,
      isValidationError: true
    });
    if (result.isDirectusError) {
      expect(result.errors.map((entry) => entry.code)).toEqual([
        "FORBIDDEN",
        "FAILED_VALIDATION",
        "CUSTOM_EXTENSION"
      ]);
    }
  });

  it("recognizes expiry and safely handles malformed or unknown input", () => {
    expect(
      useDirectusError({ errors: [{ message: "expired", extensions: { code: "TOKEN_EXPIRED" } }] })
    ).toMatchObject({ isDirectusError: true, isTokenExpiredError: true });
    expect(
      useDirectusError({
        errors: [{ message: "bad token", extensions: { code: "INVALID_TOKEN" } }]
      })
    ).toMatchObject({ isDirectusError: true, isInvalidTokenError: true });
    expect(
      useDirectusError({
        errors: [{ message: "slow down", extensions: { code: "REQUESTS_EXCEEDED" } }]
      })
    ).toMatchObject({ isDirectusError: true, isRateLimitError: true });
    expect(useDirectusError({ errors: [{ message: "missing extensions" }] })).toMatchObject({
      isDirectusError: true,
      errors: []
    });
    expect(useDirectusError(new Error("network"))).toMatchObject({
      isDirectusError: false,
      errors: []
    });
  });

  it("normalizes local auth validation issues with field-specific codes and flags", () => {
    const result = useDirectusError({
      statusCode: 400,
      data: {
        issues: [
          {
            code: "too_big",
            maximum: 512,
            inclusive: true,
            path: ["password"],
            message: "Too big: expected string to have <=512 characters"
          },
          {
            code: "invalid_format",
            format: "email",
            path: ["email"],
            message: "Invalid email address"
          },
          {
            code: "too_big",
            maximum: 6,
            path: ["otp"],
            message: "OTP is too long"
          },
          {
            code: "too_big",
            maximum: 1024,
            path: ["token"],
            message: "Reset token is too long"
          },
          {
            code: "too_big",
            maximum: 1024,
            path: ["magicLinkToken"],
            message: "Magic-link token is too long"
          }
        ]
      }
    });

    expect(result).toMatchObject({
      isDirectusError: false,
      isNitroError: true,
      statusCode: 400,
      isValidationError: true,
      isInvalidAuthInput: true,
      isInvalidEmailInput: true,
      isInvalidPasswordInput: true,
      isInvalidOtpInput: true,
      isInvalidPasswordResetTokenInput: true,
      isInvalidMagicLinkTokenInput: true
    });
    if (result.isNitroError) {
      expect(result.errors).toHaveLength(5);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "INVALID_PASSWORD_INPUT",
            message: "Too big: expected string to have <=512 characters",
            extensions: expect.objectContaining({ field: "password", maximum: 512 })
          }),
          expect.objectContaining({ code: "INVALID_EMAIL_INPUT" }),
          expect.objectContaining({ code: "INVALID_MAGIC_LINK_TOKEN_INPUT" })
        ])
      );
    }
  });

  it("keeps unrelated and Directus errors distinct from custom errors", () => {
    expect(useDirectusError(new Error("network"))).toMatchObject({
      isDirectusError: false,
      isNitroError: false,
      errors: []
    });
    expect(
      useDirectusError({ errors: [{ message: "denied", extensions: { code: "FORBIDDEN" } }] })
    ).toMatchObject({ isDirectusError: true, isNitroError: false });
  });

  it("exposes shortcuts for credential, availability, and route errors", () => {
    expect(
      useDirectusError({
        errors: [
          { message: "bad credentials", extensions: { code: "INVALID_CREDENTIALS" } },
          { message: "offline", extensions: { code: "SERVICE_UNAVAILABLE" } },
          { message: "missing route", extensions: { code: "ROUTE_NOT_FOUND" } }
        ]
      })
    ).toMatchObject({
      isDirectusError: true,
      isInvalidCredentialError: true,
      isServiceUnavailableError: true,
      isRouteNotFoundError: true
    });
  });

  it("finds envelopes nested through an SDK response and preserves its status", () => {
    expect(
      useDirectusError({
        statusCode: 403,
        response: { data: { errors: [{ message: "denied", extensions: { code: "FORBIDDEN" } }] } }
      })
    ).toMatchObject({ isDirectusError: true, statusCode: 403, errors: [{ code: "FORBIDDEN" }] });
  });

  it("handles cyclic error metadata without recursing forever", () => {
    const error: { data?: unknown } = {};
    error.data = error;
    expect(useDirectusError(error)).toMatchObject({ isDirectusError: false, errors: [] });
  });
});
