import { isReadonly, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: undefined as
    | { userId: string; email?: string; requiresTfaSetup?: boolean }
    | null
    | undefined,
  config: {
    public: {
      directusClient: { auth: { magicLinks: { enabled: true } } }
    }
  },
  fetch: vi.fn(),
  callHook: vi.fn()
}));

vi.mock("#app", () => ({
  useNuxtApp: () => ({ callHook: state.callHook }),
  useRequestFetch: () => state.fetch,
  useState: () => {
    if (state.session === undefined) state.session = null;
    return ref(state.session);
  }
}));

vi.mock("#imports", () => ({ useRuntimeConfig: () => state.config }));

const { useDirectusAuth } = await import("../src/runtime/app/composables/directus-auth");

beforeEach(() => {
  state.session = null;
  state.config.public.directusClient.auth.magicLinks.enabled = true;
  state.fetch.mockReset();
  state.callHook.mockReset();
  state.callHook.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Directus authentication hooks", () => {
  it("exposes magic-link support and the TFA setup state", () => {
    state.session = {
      userId: "user-1",
      email: "user@example.test",
      requiresTfaSetup: true
    };
    const auth = useDirectusAuth();

    expect(auth.magicLinksEnabled).toBe(true);
    expect(auth.requiresTfaSetup.value).toBe(true);
  });

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

  it("requests a magic link through the same-origin endpoint", async () => {
    const auth = useDirectusAuth();
    state.fetch.mockResolvedValue(undefined);

    await auth.requestMagicLink("user@example.test", { turnstileToken: "magic-link-token" });

    expect(state.fetch).toHaveBeenCalledWith("/_directus/auth/magic-links/request", {
      method: "POST",
      body: { email: "user@example.test" },
      headers: { "x-turnstile-token": "magic-link-token" }
    });
  });

  it("resets a password through the same-origin endpoint", async () => {
    const auth = useDirectusAuth();
    state.fetch.mockResolvedValue(undefined);

    await auth.passwordReset("reset-token", "new-password");

    expect(state.fetch).toHaveBeenCalledWith("/_directus/auth/password-reset", {
      method: "POST",
      body: { token: "reset-token", password: "new-password" }
    });
  });

  it("redeems a magic link into the normal session and login event", async () => {
    const auth = useDirectusAuth();
    const snapshot = {
      userId: "user-1",
      email: "user@example.test",
      firstName: null,
      lastName: null,
      requiresTfaSetup: false
    };
    state.fetch.mockResolvedValue(snapshot);

    await auth.redeemMagicLink("raw-token", "123456");

    expect(auth._session.value).toEqual(snapshot);
    expect(state.fetch).toHaveBeenCalledWith("/_directus/auth/magic-links/redeem", {
      method: "POST",
      body: { magicLinkToken: "raw-token", otp: "123456" }
    });
    expect(state.callHook).toHaveBeenCalledWith("directus:auth:login", snapshot);
    expect(state.callHook.mock.calls[0]?.[1]).not.toHaveProperty("accessToken");
  });

  it("does not request magic-link endpoints when support is disabled", async () => {
    state.config.public.directusClient.auth.magicLinks.enabled = false;
    const auth = useDirectusAuth();

    await auth.requestMagicLink("user@example.test");
    await auth.redeemMagicLink("raw-token");

    expect(state.fetch).not.toHaveBeenCalled();
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

  it("preserves state when refresh reports a temporary service failure", async () => {
    const auth = useDirectusAuth();
    const snapshot = { userId: "user-1" };
    state.fetch
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(
        Object.assign(new Error("temporarily unavailable"), { statusCode: 503 })
      );
    await auth.login({ email: "user@example.test", password: "secret" });

    await expect(auth.refresh()).rejects.toMatchObject({ statusCode: 503 });
    expect(auth._session.value).toEqual(snapshot);
    expect(state.callHook).not.toHaveBeenCalledWith("directus:auth:invalidated", "user-1");
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
