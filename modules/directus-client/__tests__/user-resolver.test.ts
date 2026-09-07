import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      baseUrl: "https://directus.example.test",
      auth: { user: { enabled: true, fields: ["id", { role: ["id", "name"] }] } }
    }
  },
  shared: { client: { auth: { user: { enabled: true, fields: ["id"] } } } },
  request: vi.fn(),
  createClient: vi.fn()
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("#directus-config-server", () => ({ default: state.shared }));
vi.mock("#directus", () => ({}));
vi.mock("@directus/sdk", () => ({ readMe: vi.fn((query) => ({ query })) }));
vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>()),
  createDirectusRestClient: state.createClient
}));

const { resolveDirectusUserResponse } = await import("../src/runtime/user/server/resolve-user");

beforeEach(() => {
  state.request.mockReset();
  state.request.mockResolvedValue({ id: "user-1", role: { id: "role-1", name: "Editor" } });
  state.createClient.mockReset();
  state.createClient.mockReturnValue({ request: state.request });
  state.shared.client.auth.user = { enabled: true, fields: ["id"] };
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

    state.shared.client.auth.user = {
      enabled: true,
      fields: ["id"],
      mapper: (user: Record<string, unknown>) => ({ id: user.id, mapped: true })
    };
    event.context.directusAuth.resolve = vi
      .fn()
      .mockResolvedValue({ accessToken: "session-token", snapshot: null });
    await expect(resolveDirectusUserResponse(event)).resolves.toEqual({
      id: "user-1",
      mapped: true
    });
  });
});
