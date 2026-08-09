import { describe, expect, it } from "vitest";
import { createTestEvent, resolveFixture } from "../src";

describe("test utilities", () => {
  it("creates an H3 event with request and response objects", () => {
    const event = createTestEvent();

    expect(event.node.req).toBeDefined();
    expect(event.node.res).toBeDefined();
  });

  it("resolves fixtures relative to a test file", () => {
    expect(resolveFixture("file:///workspace/modules/example/__tests__/e2e.test.ts")).toBe(
      "/workspace/modules/example/__tests__/fixtures/basic"
    );
    expect(
      resolveFixture("file:///workspace/modules/example/__tests__/e2e.test.ts", "production")
    ).toBe("/workspace/modules/example/__tests__/fixtures/production");
  });
});
