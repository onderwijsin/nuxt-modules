import { describe, expect, it } from "vitest";
import { getErrorData, getErrorStatus } from "../src/runtime/server/utils/errors";

describe("newsletter error utilities", () => {
  it("reads status and statusCode values from unknown errors", () => {
    expect(getErrorStatus({ status: 429 })).toBe(429);
    expect(getErrorStatus({ statusCode: 400 })).toBe(400);
    expect(getErrorStatus({ status: "400" })).toBeUndefined();
    expect(getErrorStatus(undefined)).toBeUndefined();
  });

  it("parses object and JSON-string provider data", () => {
    expect(getErrorData({ data: { title: "Member Exists" } })).toEqual({
      title: "Member Exists"
    });
    expect(getErrorData({ data: '{"title":"Member Exists"}' })).toEqual({
      title: "Member Exists"
    });
    expect(getErrorData({ data: "not-json" })).toBeUndefined();
    expect(getErrorData({ data: 400 })).toBeUndefined();
  });
});
