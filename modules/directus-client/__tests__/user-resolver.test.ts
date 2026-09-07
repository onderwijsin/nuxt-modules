import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  runtimeConfig: {
    directusClient: {
      baseUrl: "https://directus.example.test",
      auth: {
        user: { enabled: true, mapperEnabled: true, fields: ["id", { role: ["id", "name"] }] }
      }
    }
  },
  config: {
    client: {
      auth: {
        user: {
          enabled: true,
          mapper: undefined as ((user: Record<string, unknown>) => unknown) | undefined
        }
      }
    }
  },
  request: vi.fn(),
  createClient: vi.fn()
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.runtimeConfig }));
vi.mock("#directus-config-server", () => ({ default: state.config }));
vi.mock("#directus", () => ({}));
vi.mock("@directus/sdk", () => ({ readMe: vi.fn((query) => ({ query })) }));
vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>()),
  createDirectusRestClient: state.createClient
}));

const { resolveDirectusUserResponse } = await import("../src/runtime/user/server/resolve-user");

beforeEach(() => {
  state.request.mockReset();
  state.request.mockResolvedValue({
    id: "user-1",
    email: "user@example.test",
    role: { id: "role-1", name: "Editor" }
  });
  state.createClient.mockReset();
  state.createClient.mockReturnValue({ request: state.request });
  state.config.client.auth.user.mapper = undefined;
});

describe("Directus current-user resolver", () => {
  it("uses the request session token and exact nested fields", async () => {
    const event = createTestEvent();
    event.context.directusAuth = {
      resolve: vi.fn().mockResolvedValue({ accessToken: "session-token", snapshot: null }),
      resolveSnapshot: vi.fn()
    };

    await expect(resolveDirectusUserResponse(event)).resolves.toEqual({
      id: "user-1",
      email: "user@example.test",
      role: { id: "role-1", name: "Editor" }
    });
    expect(state.createClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://directus.example.test",
        accessToken: "session-token"
      })
    );
    expect(state.request).toHaveBeenCalledWith(
      expect.objectContaining({ query: { fields: ["id", { role: ["id", "name"] }] } })
    );
    expect(event.node.res.getHeader("cache-control")).toBe("private, no-store");
  });

  it("rejects unauthenticated requests and maps valid records server-side", async () => {
    const event = createTestEvent();
    event.context.directusAuth = {
      resolve: vi.fn().mockResolvedValue({ accessToken: undefined, snapshot: null }),
      resolveSnapshot: vi.fn()
    };
    await expect(resolveDirectusUserResponse(event)).rejects.toMatchObject({ statusCode: 401 });

    state.config.client.auth.user.mapper = (user: Record<string, unknown>) => ({
      id: user.id,
      mapped: true
    });
    event.context.directusAuth.resolve = vi
      .fn()
      .mockResolvedValue({ accessToken: "session-token", snapshot: null });
    await expect(resolveDirectusUserResponse(event)).resolves.toEqual({
      id: "user-1",
      mapped: true
    });
  });

  it.each([[], "invalid", Promise.resolve({ id: "late" }), new Date()])(
    "rejects non-plain mapper output: %s",
    async (value) => {
      const event = createTestEvent();
      event.context.directusAuth = {
        resolve: vi.fn().mockResolvedValue({ accessToken: "session-token", snapshot: null }),
        resolveSnapshot: vi.fn()
      };
      state.config.client.auth.user.mapper = () => value;

      await expect(resolveDirectusUserResponse(event)).rejects.toMatchObject({ statusCode: 502 });
    }
  );

  it("accepts a null-prototype plain mapper output", async () => {
    const event = createTestEvent();
    event.context.directusAuth = {
      resolve: vi.fn().mockResolvedValue({ accessToken: "session-token", snapshot: null }),
      resolveSnapshot: vi.fn()
    };
    state.config.client.auth.user.mapper = () =>
      Object.assign(Object.create(null), { id: "user-1" });

    await expect(resolveDirectusUserResponse(event)).resolves.toEqual({ id: "user-1" });
  });

  it("propagates mapper exceptions unchanged", async () => {
    const event = createTestEvent();
    event.context.directusAuth = {
      resolve: vi.fn().mockResolvedValue({ accessToken: "session-token", snapshot: null }),
      resolveSnapshot: vi.fn()
    };
    const failure = new Error("mapper exploded");
    state.config.client.auth.user.mapper = () => {
      throw failure;
    };

    await expect(resolveDirectusUserResponse(event)).rejects.toBe(failure);
  });
});
