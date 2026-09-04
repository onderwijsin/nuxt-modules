import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readItems } from "@directus/sdk";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test",
      staticToken: "static-token",
      auth: { enabled: false }
    },
    public: {
      directusClient: {
        preview: {
          enabled: true,
          versioning: true,
          queryKeys: { preview: "preview", token: "token", version: "version", id: "id" }
        }
      }
    }
  }
}));

vi.mock("#imports", () => ({
  useRuntimeConfig: () => state.config
}));

const { createServerDirectusClient } = await import("../src/runtime/server/utils/client");

beforeEach(() => {
  state.config.directusClient.auth.enabled = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Directus server client authentication boundary", () => {
  it("does not load or select a session when auth is disabled", async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer static-token");
      return new Response(JSON.stringify({ data: [] }), {
        headers: { "content-type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(
      createServerDirectusClient(createTestEvent()).request(readItems("pages"))
    ).resolves.toEqual([]);
  });

  it("uses a refreshed session only when auth is enabled", async () => {
    state.config.directusClient.auth.enabled = true;
    const event = createTestEvent();
    const resolve = vi.fn().mockResolvedValue({
      accessToken: "session-token",
      snapshot: null
    });
    event.context.directusAuth = { resolve };
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer session-token");
      return new Response(JSON.stringify({ data: [] }), {
        headers: { "content-type": "application/json" }
      });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(createServerDirectusClient(event).request(readItems("pages"))).resolves.toEqual(
      []
    );
    expect(resolve).toHaveBeenCalledTimes(1);
  });
});
