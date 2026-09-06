import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestEvent } from "../../../packages/test-utils/src";

const state = vi.hoisted(() => ({
  event: null as ReturnType<typeof createTestEvent> | null,
  session: { value: null as unknown },
  resolve: vi.fn(),
  getDirectusSessionSnapshot: vi.fn(),
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
vi.mock("../src/runtime/auth/server/refresh", () => ({
  isTransientDirectusRefreshError: (error: unknown) => error === "transient"
}));
vi.mock("../src/runtime/auth/server/session", () => ({
  getDirectusSessionSnapshot: state.getDirectusSessionSnapshot
}));

const { default: ssrSessionPlugin } = await import("../src/runtime/auth/app/ssr-session-plugin");

beforeEach(() => {
  state.event = createTestEvent();
  state.resolve.mockReset();
  state.getDirectusSessionSnapshot.mockReset();
  state.createServerDirectusClient.mockReset();
  state.session.value = null;
});

describe("SSR session plugin", () => {
  it("hydrates the refreshed snapshot", async () => {
    const snapshot = { userId: "refreshed-user" };
    state.event!.context.directusAuth = { resolve: state.resolve };
    state.resolve.mockResolvedValue({ accessToken: "access-token", snapshot });

    await ssrSessionPlugin();

    expect(state.session.value).toEqual(snapshot);
    expect(state.getDirectusSessionSnapshot).not.toHaveBeenCalled();
  });

  it("falls back to the local snapshot only for a classified transient failure", async () => {
    const snapshot = { userId: "local-user" };
    state.event!.context.directusAuth = { resolve: state.resolve };
    state.resolve.mockRejectedValue("transient");
    state.getDirectusSessionSnapshot.mockResolvedValue(snapshot);

    await ssrSessionPlugin();

    expect(state.session.value).toEqual(snapshot);
    expect(state.getDirectusSessionSnapshot).toHaveBeenCalledWith(state.event);
  });

  it("propagates unexpected resolver errors", async () => {
    const error = new Error("unexpected");
    state.event!.context.directusAuth = { resolve: state.resolve };
    state.resolve.mockRejectedValue(error);

    await expect(ssrSessionPlugin()).rejects.toBe(error);
    expect(state.getDirectusSessionSnapshot).not.toHaveBeenCalled();
  });
});
