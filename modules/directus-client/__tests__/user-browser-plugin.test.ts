import { beforeEach, describe, expect, it, vi } from "vitest";
import { ofetch } from "ofetch";

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
vi.mock("ofetch", () => ({ ofetch: vi.fn() }));

const plugin = (await import("../src/runtime/user/app/browser-plugin")).default as (app: {
  hook: (name: string, callback: () => unknown) => void;
}) => unknown;

beforeEach(() => {
  state.hooks.clear();
  state.refreshNuxtData.mockReset();
  state.clearNuxtData.mockReset();
});

describe("Directus current-user browser lifecycle", () => {
  it("refreshes after login even when async-data has no payload yet", async () => {
    const app = {
      hook: (name: string, callback: () => unknown) => state.hooks.set(name, callback)
    };
    plugin(app);

    await state.hooks.get("directus:auth:login")?.();

    expect(state.refreshNuxtData).toHaveBeenCalledWith("directus:user");
  });

  it.each(["directus:auth:logout", "directus:auth:invalidated"])(
    "clears current-user data on %s without a payload",
    async (hookName) => {
      const app = {
        hook: (name: string, callback: () => unknown) => state.hooks.set(name, callback)
      };
      plugin(app);

      await state.hooks.get(hookName)?.();

      expect(state.clearNuxtData).toHaveBeenCalledWith("directus:user");
    }
  );

  it.each(["directus:auth:logout", "directus:auth:invalidated"])(
    "does not let a late current-user response repopulate data after %s",
    async (hookName) => {
      let currentPromise: Promise<unknown> | undefined;
      let currentData: unknown = null;
      const response = Promise.resolve({ id: "stale-user" });
      vi.mocked(ofetch).mockReturnValue(response);

      state.clearNuxtData.mockImplementation(() => {
        currentPromise = undefined;
        currentData = null;
      });

      const app = {
        hook: (name: string, callback: () => unknown) => state.hooks.set(name, callback)
      };
      const result = plugin(app) as {
        provide: { directusUser: () => Promise<unknown> };
      };
      const requestPromise = result.provide.directusUser();
      currentPromise = requestPromise;

      await state.hooks.get(hookName)?.();

      const payload = await requestPromise;
      if (currentPromise === requestPromise) currentData = payload;

      expect(currentData).toBeNull();
    }
  );

  it("does not register a refresh hook for auth refresh", () => {
    const app = {
      hook: (name: string, callback: () => unknown) => state.hooks.set(name, callback)
    };
    plugin(app);

    expect(state.hooks.has("directus:auth:refresh")).toBe(false);
  });
});
