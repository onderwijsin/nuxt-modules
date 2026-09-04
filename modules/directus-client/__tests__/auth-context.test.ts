import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  register: vi.fn(),
  ensureFreshDirectusSession: vi.fn()
}));

vi.mock("nitropack/runtime", () => ({
  defineNitroPlugin: (plugin: (nitroApp: unknown) => void) => {
    plugin({ hooks: { hook: state.register } });
    return plugin;
  }
}));
vi.mock("../src/runtime/server/utils/auth", () => ({
  ensureFreshDirectusSession: state.ensureFreshDirectusSession
}));

await import("../src/runtime/server/plugins/directus-auth");

beforeEach(() => {
  state.ensureFreshDirectusSession.mockReset();
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
});
