import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  hooks: new Map<string, () => unknown>(),
  refreshNuxtData: vi.fn(),
  clearNuxtData: vi.fn()
}));

vi.mock("#app", () => ({
  clearNuxtData: state.clearNuxtData,
  defineNuxtPlugin: (plugin: unknown) => plugin,
  refreshNuxtData: state.refreshNuxtData
}));

const plugin = (await import("../src/runtime/user/app/plugin.client")).default as (app: {
  hook: (name: string, callback: () => unknown) => void;
}) => unknown;

beforeEach(() => {
  state.hooks.clear();
  state.refreshNuxtData.mockReset();
  state.clearNuxtData.mockReset();
});

describe("Directus current-user lifecycle", () => {
  it("refreshes on login and clears on logout or invalidation", async () => {
    plugin({ hook: (name, callback) => state.hooks.set(name, callback) });

    await state.hooks.get("directus:auth:login")?.();
    await state.hooks.get("directus:auth:logout")?.();
    await state.hooks.get("directus:auth:invalidated")?.();

    expect(state.refreshNuxtData).toHaveBeenCalledWith("directus:user");
    expect(state.clearNuxtData).toHaveBeenCalledTimes(2);
    expect(state.hooks.has("directus:auth:refresh")).toBe(false);
  });
});
