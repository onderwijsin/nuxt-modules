import { isReadonly, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: undefined as { userId: string; email?: string } | null | undefined,
  fetch: vi.fn(),
  callHook: vi.fn()
}));

vi.mock("#app", () => ({
  useNuxtApp: () => ({ callHook: state.callHook }),
  useState: () => {
    if (state.session === undefined) state.session = null;
    return ref(state.session);
  }
}));

vi.mock("#imports", () => ({
  $fetch: state.fetch
}));

const { useDirectusAuth } = await import("../src/runtime/app/composables/directus-auth");

beforeEach(() => {
  state.session = null;
  state.fetch.mockReset();
  state.callHook.mockReset();
  state.callHook.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Directus authentication hooks", () => {
  it("emits a token-free login payload after the session request succeeds", async () => {
    const auth = useDirectusAuth();
    const snapshot = { userId: "user-1", email: "user@example.test" };
    state.fetch.mockResolvedValue(snapshot);

    await auth.login({ email: snapshot.email, password: "secret" });

    expect(state.callHook).toHaveBeenCalledWith("directus:auth:login", snapshot);
    const payload = state.callHook.mock.calls[0]?.[1];
    expect(isReadonly(payload)).toBe(true);
    expect(payload).not.toHaveProperty("accessToken");
    expect(payload).not.toHaveProperty("refreshToken");
    expect(state.callHook.mock.invocationCallOrder[0]).toBeGreaterThan(
      state.fetch.mock.invocationCallOrder[0]
    );
  });

  it("forwards Turnstile tokens from authentication request metadata", async () => {
    const auth = useDirectusAuth();
    state.fetch.mockResolvedValue({ userId: "user-1" });

    await auth.login(
      { email: "user@example.test", password: "secret" },
      { turnstileToken: "login-token" }
    );
    await auth.passwordRequest("user@example.test", { turnstileToken: "password-token" });

    expect(state.fetch).toHaveBeenNthCalledWith(
      1,
      "/_directus/auth/login",
      expect.objectContaining({ headers: { "x-turnstile-token": "login-token" } })
    );
    expect(state.fetch).toHaveBeenNthCalledWith(
      2,
      "/_directus/auth/password-request",
      expect.objectContaining({ headers: { "x-turnstile-token": "password-token" } })
    );
  });

  it("emits refresh with the safe snapshot after a successful refresh", async () => {
    const auth = useDirectusAuth();
    const snapshot = { userId: "user-1" };
    state.fetch.mockResolvedValue(snapshot);

    await auth.refresh();

    expect(state.callHook).toHaveBeenCalledWith("directus:auth:refresh", snapshot);
  });

  it("clears state and emits invalidated when refresh fails", async () => {
    const auth = useDirectusAuth();
    state.fetch
      .mockResolvedValueOnce({ userId: "user-1" })
      .mockRejectedValueOnce(new Error("expired"));
    await auth.login({ email: "user@example.test", password: "secret" });

    await expect(auth.refresh()).rejects.toThrow("expired");
    expect(auth._session.value).toBeNull();
    expect(state.callHook).toHaveBeenLastCalledWith("directus:auth:invalidated", "user-1");
  });

  it("emits logout after local state is cleared, even when upstream logout fails", async () => {
    const auth = useDirectusAuth();
    state.fetch
      .mockResolvedValueOnce({ userId: "user-1" })
      .mockRejectedValueOnce(new Error("down"));
    await auth.login({ email: "user@example.test", password: "secret" });

    await expect(auth.logout()).rejects.toThrow("down");
    expect(auth._session.value).toBeNull();
    expect(state.callHook).toHaveBeenLastCalledWith("directus:auth:logout", "user-1");
  });

  it("does not fail authentication transitions when a hook throws", async () => {
    const auth = useDirectusAuth();
    state.fetch.mockResolvedValue({ userId: "user-1" });
    state.callHook.mockRejectedValue(new Error("consumer hook failed"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      auth.login({ email: "user@example.test", password: "secret" })
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(
      "Directus authentication hook failed: directus:auth:login",
      expect.any(Error)
    );
  });
});
