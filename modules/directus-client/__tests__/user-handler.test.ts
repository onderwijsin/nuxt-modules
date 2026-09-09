import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  runtimeConfig: {
    directusClient: {
      baseUrl: "https://directus.example.test",
      auth: { user: { enabled: true, fields: ["id", { role: ["id", "name"] }] } }
    }
  },
  request: vi.fn(),
  createClient: vi.fn()
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.runtimeConfig }));
vi.mock("#directus", () => ({}));
vi.mock("@directus/sdk", () => ({ readMe: vi.fn((query) => ({ query })) }));
vi.mock("@onderwijsin/nuxt-module-utils/shared", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@onderwijsin/nuxt-module-utils/shared")>()),
  createDirectusRestClient: state.createClient
}));

const { createDirectusUserHandler } = await import("../src/runtime/user/server/create-handler");

beforeEach(() => {
  state.request.mockReset();
  state.request.mockResolvedValue({ id: "user-1", email: "user@example.test" });
  state.createClient.mockReset();
  state.createClient.mockReturnValue({ request: state.request });
});

function authenticatedEvent() {
  const event = createTestEvent();
  event.context.directusAuth = {
    resolve: vi.fn().mockResolvedValue({ accessToken: "session-token", snapshot: null }),
    resolveSnapshot: vi.fn()
  };
  return event;
}

describe("Directus current-user handler", () => {
  it("uses the session token, configured fields, and cache header", async () => {
    const handler = createDirectusUserHandler();
    const event = authenticatedEvent();

    await expect(handler(event)).resolves.toEqual({ id: "user-1", email: "user@example.test" });
    expect(state.createClient).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "session-token" })
    );
    expect(state.request).toHaveBeenCalledWith({
      query: { fields: ["id", { role: ["id", "name"] }] }
    });
    expect(event.node.res.getHeader("cache-control")).toBe("private, no-store");
  });

  it("returns mapper output and propagates mapper failures", async () => {
    const mapper = vi.fn((user: Record<string, unknown>) => ({ name: user.email }));
    await expect(createDirectusUserHandler(mapper)(authenticatedEvent())).resolves.toEqual({
      name: "user@example.test"
    });

    const failure = new Error("mapper exploded");
    const throwingMapper = () => {
      throw failure;
    };
    await expect(createDirectusUserHandler(throwingMapper)(authenticatedEvent())).rejects.toBe(
      failure
    );
  });

  it("rejects unauthenticated requests", async () => {
    const event = createTestEvent();
    event.context.directusAuth = {
      resolve: vi.fn().mockResolvedValue({ accessToken: undefined, snapshot: null }),
      resolveSnapshot: vi.fn()
    };

    await expect(createDirectusUserHandler()(event)).rejects.toMatchObject({ statusCode: 401 });
  });

  it("fails closed when user fetching is disabled", async () => {
    state.runtimeConfig.directusClient.auth.user = { enabled: false };
    await expect(createDirectusUserHandler()(authenticatedEvent())).rejects.toMatchObject({
      statusCode: 500
    });
    expect(state.createClient).not.toHaveBeenCalled();
  });
});
