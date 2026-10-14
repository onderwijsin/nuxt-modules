import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readItems } from "@directus/sdk";
import type { DirectusPreviewOptions } from "../src/runtime/preview/context";

const state = vi.hoisted(() => {
  const query: Record<string, string | string[]> = {};
  return {
    route: { fullPath: "/", query },
    preview: {
      enabled: true,
      versioning: true,
      queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
    } satisfies DirectusPreviewOptions,
    refresh: vi.fn()
  };
});

vi.mock("#app", () => ({
  defineNuxtPlugin: <T>(plugin: T) => plugin,
  refreshNuxtData: state.refresh
}));
vi.mock("#imports", () => ({
  useRuntimeConfig: () => ({
    public: { directusClient: { proxy: { path: "/_directus/proxy" }, preview: state.preview } }
  }),
  useRoute: () => state.route
}));

const { default: plugin } = await import("../src/runtime/client/app/browser-plugin");
const hooks = new Map<string, () => unknown>();
const app = {
  hook: (name: string, callback: () => unknown) => hooks.set(name, callback)
};

beforeEach(() => {
  state.route = { fullPath: "/", query: {} };
  state.preview.enabled = true;
  state.preview.queryKeys.preview = "preview";
  state.preview.queryKeys.token = "token";
  state.refresh.mockReset();
  hooks.clear();
  vi.stubGlobal("location", { origin: "https://app.example.test" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser preview", () => {
  it("registers refresh only for preview and refreshes after each page finishes", () => {
    state.route.query = { preview: "true" };
    plugin(app);
    expect(state.refresh).not.toHaveBeenCalled();
    hooks.get("page:finish")?.();
    expect(state.refresh).toHaveBeenCalledTimes(1);
    state.route.query = {};
    hooks.get("page:finish")?.();
    expect(state.refresh).toHaveBeenCalledTimes(2);
  });

  it("does not register global refreshes for ordinary browsing", () => {
    plugin(app);
    expect(hooks.has("page:finish")).toBe(false);
    expect(state.refresh).not.toHaveBeenCalled();
  });

  it("retains the preview credential across navigation and restricts it to the same-origin proxy", async () => {
    state.preview.queryKeys.preview = "editing";
    state.preview.queryKeys.token = "capability";
    state.route.query = { editing: "true", capability: "first-preview" };
    const received: Headers[] = [];
    const requests: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        requests.push(input);
        received.push(new Headers(init?.headers));
        return new Response(JSON.stringify({ data: [] }), {
          headers: { "content-type": "application/json" }
        });
      })
    );
    const result = plugin(app);
    await result.provide.directus.request(readItems("pages"));
    state.route.query = { editing: "true", capability: "second-preview" };
    await result.provide.directus.request(readItems("pages"));
    state.route.query = {};
    await result.provide.directus.request(readItems("pages"));
    result.provide.directus.url.host = "external.example.test";
    await result.provide.directus.request(readItems("pages"));
    expect(received.map((headers) => headers.get("x-directus-preview-token"))).toEqual([
      "first-preview",
      "first-preview",
      "first-preview",
      null
    ]);
    expect(requests.every((request) => !request.includes("preview"))).toBe(true);
    expect(received.every((headers) => !headers.has("authorization"))).toBe(true);
  });

  it.each([false, true])(
    "ignores unavailable preview credentials (enabled: %s)",
    async (enabled) => {
      state.preview.enabled = enabled;
      state.route.query = { preview: "true", token: ["ambiguous", "token"] };
      const received: Headers[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_input: string, init?: RequestInit) => {
          received.push(new Headers(init?.headers));
          return new Response(JSON.stringify({ data: [] }), {
            headers: { "content-type": "application/json" }
          });
        })
      );
      const result = plugin(app);
      await result.provide.directus.request(readItems("pages"));
      expect(received[0]?.has("x-directus-preview-token")).toBe(false);
      expect(hooks.has("page:finish")).toBe(enabled);
    }
  );
});
