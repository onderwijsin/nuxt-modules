import { describe, expect, it } from "vitest";
import { turnstileOptionsSchema } from "../src/config/options.schema";

describe("turnstile option schema", () => {
  it("resolves the module defaults when options are omitted", () => {
    expect(turnstileOptionsSchema.parse({})).toEqual({
      enabled: true,
      siteKey: "",
      secretKey: "",
      adminToken: "",
      adminHeaderName: "x-admin-token"
    });
  });
});
