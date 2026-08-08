import { describe, expect, it } from "vitest";
import { getErrorData, getErrorStatus } from "../src/runtime/server/utils/errors";

describe("newsletter error utilities", () => {
  it("reads status and statusCode values from unknown errors", () => {
    expect(getErrorStatus({ status: 429 })).toBe(429);
    expect(getErrorStatus({ statusCode: 400 })).toBe(400);
    expect(getErrorStatus({ status: "400" })).toBeUndefined();
    expect(getErrorStatus(undefined)).toBeUndefined();
  });

  it("parses object and JSON-string provider data", async () => {
    await expect(getErrorData({ data: { title: "Member Exists" } })).resolves.toEqual({
      title: "Member Exists"
    });
    await expect(getErrorData({ data: '{"title":"Member Exists"}' })).resolves.toEqual({
      title: "Member Exists"
    });
    await expect(getErrorData({ data: "not-json" })).resolves.toBeUndefined();
    await expect(getErrorData({ data: 400 })).resolves.toBeUndefined();
  });
});
