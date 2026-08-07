import { beforeEach, describe, expect, it, vi } from "vitest";

const setHeader = vi.fn();
const setResponseStatus = vi.fn();

vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  setHeader,
  setResponseStatus
}));

describe("healthcheck routes", () => {
  beforeEach(() => {
    vi.resetModules();
    setHeader.mockReset();
    setResponseStatus.mockReset();
  });

  it("returns pong as plain text", async () => {
    const handler = (await import("../src/runtime/server/api/system/ping.get")).default as any;
    const event = {};
    expect(handler(event)).toBe("pong");
    expect(setHeader).toHaveBeenCalledWith(event, "content-type", "text/plain; charset=utf-8");
  });
});
