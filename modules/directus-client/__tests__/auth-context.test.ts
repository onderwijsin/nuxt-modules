import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  register: vi.fn(),
  ensureFreshDirectusSession: vi.fn(),
  getDirectusSessionSnapshot: vi.fn()
}));

vi.mock("nitropack/runtime", () => ({
  defineNitroPlugin: (plugin: (nitroApp: unknown) => void) => {
    plugin({ hooks: { hook: state.register } });
    return plugin;
  }
}));
vi.mock("../src/runtime/auth/server/refresh", () => ({
  ensureFreshDirectusSession: state.ensureFreshDirectusSession,
  isTransientDirectusRefreshError: (error: unknown) => error === "transient"
}));
vi.mock("../src/runtime/auth/server/session", () => ({
  getDirectusSessionSnapshot: state.getDirectusSessionSnapshot
}));

await import("../src/runtime/auth/server/nitro-plugin");

beforeEach(() => {
  state.ensureFreshDirectusSession.mockReset();
  state.getDirectusSessionSnapshot.mockReset();
});

describe("Directus request authentication boundary", () => {
  it("attaches a lazy resolver without resolving authentication during the request hook", async () => {
    const event = createTestEvent();
    const requestHook = state.register.mock.calls[0]?.[1];

    requestHook(event);

    expect(state.ensureFreshDirectusSession).not.toHaveBeenCalled();
    expect(event.context.directusAuth).toBeDefined();

    state.ensureFreshDirectusSession.mockResolvedValue({
      accessToken: "access-token",
      snapshot: { userId: "user-1" }
    });
    await expect(event.context.directusAuth?.resolve()).resolves.toEqual({
      accessToken: "access-token",
      snapshot: { userId: "user-1" }
    });
    expect(state.ensureFreshDirectusSession).toHaveBeenCalledTimes(1);
  });

  it("memoizes concurrent and sequential resolution per request", async () => {
    const event = createTestEvent();
    const requestHook = state.register.mock.calls[0]?.[1];
    const session = { accessToken: "access-token", snapshot: { userId: "user-1" } };
    state.ensureFreshDirectusSession.mockResolvedValue(session);

    requestHook(event);
    const first = event.context.directusAuth?.resolve();
    const second = event.context.directusAuth?.resolve();
    expect(first).toBe(second);
    await Promise.all([first, second, event.context.directusAuth?.resolve()]);
    await event.context.directusAuth?.resolve();

    expect(state.ensureFreshDirectusSession).toHaveBeenCalledTimes(1);
  });

  it("returns the refreshed snapshot through the hydration resolver", async () => {
    const event = createTestEvent();
    const snapshot = { userId: "user-1" };
    state.ensureFreshDirectusSession.mockResolvedValue({ accessToken: "access-token", snapshot });

    state.register.mock.calls[0]?.[1](event);

    await expect(event.context.directusAuth?.resolveSnapshot()).resolves.toEqual(snapshot);
    expect(state.getDirectusSessionSnapshot).not.toHaveBeenCalled();
  });

  it("falls back to the local snapshot only for transient refresh failures", async () => {
    const event = createTestEvent();
    const snapshot = { userId: "user-1" };
    state.ensureFreshDirectusSession.mockRejectedValue("transient");
    state.getDirectusSessionSnapshot.mockResolvedValue(snapshot);

    state.register.mock.calls[0]?.[1](event);

    await expect(event.context.directusAuth?.resolveSnapshot()).resolves.toEqual(snapshot);
    expect(state.getDirectusSessionSnapshot).toHaveBeenCalledWith(event);
  });

  it("propagates non-transient snapshot resolution failures", async () => {
    const event = createTestEvent();
    const error = new Error("unexpected");
    state.ensureFreshDirectusSession.mockRejectedValue(error);

    state.register.mock.calls[0]?.[1](event);

    await expect(event.context.directusAuth?.resolveSnapshot()).rejects.toBe(error);
    expect(state.getDirectusSessionSnapshot).not.toHaveBeenCalled();
  });
});
