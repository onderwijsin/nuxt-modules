import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const { callHook, refreshRedirectStorage } = vi.hoisted(() => ({
  callHook: vi.fn(),
  refreshRedirectStorage: vi.fn()
}));

vi.mock("nitropack/runtime", () => ({
  useNitroApp: () => ({ hooks: { callHook } })
}));

vi.mock("../src/runtime/server/utils/storage", () => ({ refreshRedirectStorage }));

import { refreshRedirects } from "../src/runtime/server/utils/refresh";

describe("refreshRedirects", () => {
  beforeEach(() => {
    callHook.mockReset();
    refreshRedirectStorage.mockReset();
  });

  it("collects registered sources, forwards the event, and stores results in source order", async () => {
    const event = createTestEvent();
    const first = vi.fn().mockResolvedValue([{ from: "/first", to: "/one" }]);
    const second = vi.fn().mockResolvedValue([{ from: "/second", to: "/two" }]);
    callHook.mockImplementation(async (_name, context) => {
      context.sources.push(first, second);
    });
    refreshRedirectStorage.mockResolvedValue({
      "/first": { from: "/first", to: "/one", statusCode: 302 }
    });

    await expect(refreshRedirects(event)).resolves.toEqual({
      "/first": { from: "/first", to: "/one", statusCode: 302 }
    });

    expect(callHook).toHaveBeenCalledWith("redirects:sources", expect.any(Object));
    expect(first).toHaveBeenCalledWith(event);
    expect(second).toHaveBeenCalledWith(event);
    expect(refreshRedirectStorage).toHaveBeenCalledWith([
      [{ from: "/first", to: "/one" }],
      [{ from: "/second", to: "/two" }]
    ]);
  });

  it("publishes an empty index when no sources are registered", async () => {
    callHook.mockResolvedValue(undefined);
    refreshRedirectStorage.mockResolvedValue({});

    await expect(refreshRedirects()).resolves.toEqual({});
    expect(refreshRedirectStorage).toHaveBeenCalledWith([]);
  });

  it("does not mutate storage when a source fails", async () => {
    const failure = new Error("source unavailable");
    callHook.mockImplementation(async (_name, context) => {
      context.sources.push(async () => {
        throw failure;
      });
    });

    await expect(refreshRedirects()).rejects.toThrow(failure);
    expect(refreshRedirectStorage).not.toHaveBeenCalled();
  });
});
