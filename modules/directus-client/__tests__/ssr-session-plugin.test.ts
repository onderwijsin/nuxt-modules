import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  event: null as ReturnType<typeof createTestEvent> | null,
  session: { value: null as unknown },
  resolve: vi.fn(),
  resolveSnapshot: vi.fn(),
  createServerDirectusClient: vi.fn()
}));

vi.mock("#app", () => ({
  defineNuxtPlugin: (plugin: () => unknown) => plugin,
  useRequestEvent: () => state.event,
  useState: () => state.session
}));
vi.mock("../src/runtime/client/server/create-client", () => ({
  createServerDirectusClient: state.createServerDirectusClient
}));
const { default: ssrSessionPlugin } = await import("../src/runtime/auth/app/ssr-session-plugin");

beforeEach(() => {
  state.event = createTestEvent();
  state.resolve.mockReset();
  state.resolveSnapshot.mockReset();
  state.createServerDirectusClient.mockReset();
  state.session.value = null;
});

describe("SSR session plugin", () => {
  it("hydrates the refreshed snapshot", async () => {
    const snapshot = { userId: "refreshed-user" };
    state.event!.context.directusAuth = {
      resolve: state.resolve,
      resolveSnapshot: state.resolveSnapshot
    };
    state.resolveSnapshot.mockResolvedValue(snapshot);

    await ssrSessionPlugin();

    expect(state.session.value).toEqual(snapshot);
    expect(state.resolve).not.toHaveBeenCalled();
  });

  it("hydrates the snapshot exposed by the request auth context", async () => {
    const snapshot = { userId: "local-user" };
    state.event!.context.directusAuth = {
      resolve: state.resolve,
      resolveSnapshot: state.resolveSnapshot
    };
    state.resolveSnapshot.mockResolvedValue(snapshot);

    await ssrSessionPlugin();

    expect(state.session.value).toEqual(snapshot);
    expect(state.resolveSnapshot).toHaveBeenCalledTimes(1);
  });

  it("propagates unexpected resolver errors", async () => {
    const error = new Error("unexpected");
    state.event!.context.directusAuth = {
      resolve: state.resolve,
      resolveSnapshot: state.resolveSnapshot
    };
    state.resolveSnapshot.mockRejectedValue(error);

    await expect(ssrSessionPlugin()).rejects.toBe(error);
    expect(state.resolve).not.toHaveBeenCalled();
  });
});
