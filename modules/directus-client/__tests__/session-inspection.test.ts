import { describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  config: {
    directusClient: {
      auth: { cookie: { name: "directus_session" } },
      public: { auth: { maskSecretsInPlayground: true } }
    },
    public: { directusClient: { auth: { maskSecretsInPlayground: true } } }
  },
  read: vi.fn()
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));
vi.mock("../src/runtime/server/utils/session", () => ({
  getDirectusSessionDetails: state.read
}));

const { default: inspectSession } = await import("../playground/server/api/session-inspection.get");

describe("Directus playground session inspection", () => {
  it("returns 404 in production before reading cookie data", async () => {
    const event = createTestEvent();
    event.node.req.headers.cookie = "directus_session=sealed";

    await expect(inspectSession(event)).rejects.toMatchObject({ statusCode: 404 });
    expect(state.read).not.toHaveBeenCalled();
  });

  it("returns 404 in production without reading session data", async () => {
    state.read.mockReset();

    await expect(inspectSession(createTestEvent())).rejects.toMatchObject({ statusCode: 404 });
    expect(state.read).not.toHaveBeenCalled();
  });
});
