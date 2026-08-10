import { describe, expect, it } from "vitest";

import { useDirectusError } from "../src/runtime/app/composables/directus-error";
import { parseDirectusPreviewContext } from "../src/runtime/utils/preview";

const preview = {
  enabled: true,
  versioning: true,
  queryKeys: { preview: "preview", token: "token", version: "version" }
};

describe("Directus preview context", () => {
  it("accepts preview tokens and named versions, but omits main", () => {
    expect(
      parseDirectusPreviewContext(
        { preview: "true", token: "preview-token", version: "draft" },
        preview
      )
    ).toEqual({
      isPreview: true,
      token: "preview-token",
      version: "draft"
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
    expect(result).toMatchObject({ isDirectusError: true, statusCode: 401, isOtpError: true });
    if (result.isDirectusError) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors[1]?.code).toBe("MY_EXTENSION_CODE");
    }
  });

  it("recognizes expiry and safely handles malformed or unknown input", () => {
    expect(
      useDirectusError({ errors: [{ message: "expired", extensions: { code: "TOKEN_EXPIRED" } }] })
    ).toMatchObject({ isDirectusError: true, tokenExpired: true });
    expect(useDirectusError({ errors: [{ message: "missing extensions" }] })).toMatchObject({
      isDirectusError: true,
      errors: []
    });
    expect(useDirectusError(new Error("network"))).toMatchObject({
      isDirectusError: false,
      errors: []
    });
  });
});
