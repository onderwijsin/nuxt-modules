import { computed, readonly, type ComputedRef, type DeepReadonly, type Ref } from "vue";
import { useNuxtApp, useState } from "#app";
import { $fetch, useRuntimeConfig } from "#imports";
import { attempt } from "@onderwijsin/nuxt-module-utils";

import type { DirectusSessionSnapshot } from "../../server/utils/session";

/** Token-free session payload delivered to Directus authentication hooks. */
export type DirectusAuthSession = DeepReadonly<DirectusSessionSnapshot>;

/** Optional metadata forwarded with a Directus authentication mutation. */
export interface DirectusAuthRequestMeta {
  readonly turnstileToken?: string;
}

/** Client-safe authentication facade. Tokens remain exclusively in the httpOnly cookie. */
export interface DirectusAuthFacade {
  readonly _session: DeepReadonly<Ref<DirectusSessionSnapshot | null>>;
  readonly isAuthenticated: DeepReadonly<ComputedRef<boolean>>;
  readonly userId: DeepReadonly<ComputedRef<string | undefined>>;
  readonly magicLinksEnabled: boolean;
  readonly requiresTfaSetup: DeepReadonly<ComputedRef<boolean>>;
  readonly login: (
    input: { email: string; password: string; otp?: string },
    meta?: DirectusAuthRequestMeta
  ) => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly passwordRequest: (email: string, meta?: DirectusAuthRequestMeta) => Promise<void>;
  readonly passwordReset: (token: string, password: string) => Promise<void>;
  readonly requestMagicLink: (email: string, meta?: DirectusAuthRequestMeta) => Promise<void>;
  readonly redeemMagicLink: (token: string, otp?: string) => Promise<void>;
}

/**
 * Provides a reactive projection of the server-owned Directus session.
 * @returns The client-safe authentication facade.
 */
export function useDirectusAuth(): DirectusAuthFacade {
  const nuxtApp = useNuxtApp();
  const runtimeConfig = useRuntimeConfig();
  const magicLinksEnabled = runtimeConfig.public.directusClient.auth.magicLinks.enabled;
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  const setSession = (value: DirectusSessionSnapshot | null): void => {
    session.value = value;
  };
  const emit = async (
    name: keyof DirectusAuthHooks,
    callback: () => Promise<void>
  ): Promise<void> => {
    const result = await attempt(callback);
    if (result.error !== null)
      console.error(`Directus authentication hook failed: ${name}`, result.error);
  };
  const sessionView = readonly(session);
  const authenticatedView = readonly(computed(() => session.value !== null));
  const userIdView = readonly(computed(() => session.value?.userId));
  const requiresTfaSetupView = readonly(computed(() => session.value?.requiresTfaSetup ?? false));
  return {
    _session: sessionView,
    isAuthenticated: authenticatedView,
    userId: userIdView,
    magicLinksEnabled,
    requiresTfaSetup: requiresTfaSetupView,
    login: async (input, meta): Promise<void> => {
      const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/login", {
        method: "POST",
        body: input,
        headers: meta?.turnstileToken ? { "x-turnstile-token": meta.turnstileToken } : undefined
      });
      setSession(value);
      await emit("directus:auth:login", () =>
        Promise.resolve(nuxtApp.callHook("directus:auth:login", readonly(value)))
      );
    },
    refresh: async (): Promise<void> => {
      const result = await attempt(async () => {
        const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/refresh", {
          method: "POST"
        });
        setSession(value);
        await emit("directus:auth:refresh", () =>
          Promise.resolve(nuxtApp.callHook("directus:auth:refresh", readonly(value)))
        );
      });
      if (result.error !== null) {
        const previousUserId = session.value?.userId ?? null;
        setSession(null);
        await emit("directus:auth:invalidated", () =>
          Promise.resolve(nuxtApp.callHook("directus:auth:invalidated", previousUserId))
        );
        throw result.error;
      }
    },
    logout: async (): Promise<void> => {
      const previousUserId = session.value?.userId ?? null;
      const result = await attempt(async () => {
        await $fetch("/_directus/auth/logout", { method: "POST" });
      });
      setSession(null);
      await emit("directus:auth:logout", () =>
        Promise.resolve(nuxtApp.callHook("directus:auth:logout", previousUserId))
      );
      if (result.error !== null) throw result.error;
    },
    passwordRequest: async (email, meta): Promise<void> => {
      await $fetch("/_directus/auth/password-request", {
        method: "POST",
        body: { email },
        headers: meta?.turnstileToken ? { "x-turnstile-token": meta.turnstileToken } : undefined
      });
    },
    passwordReset: async (token, password): Promise<void> => {
      await $fetch("/_directus/auth/password-reset", {
        method: "POST",
        body: { token, password }
      });
    },
    requestMagicLink: async (email, meta): Promise<void> => {
      if (!magicLinksEnabled) return;
      await $fetch("/_directus/auth/magic-links/request", {
        method: "POST",
        body: { email },
        headers: meta?.turnstileToken ? { "x-turnstile-token": meta.turnstileToken } : undefined
      });
    },
    redeemMagicLink: async (token, otp): Promise<void> => {
      if (!magicLinksEnabled) return;
      const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/magic-links/redeem", {
        method: "POST",
        body: { magicLinkToken: token, ...(otp ? { otp } : {}) }
      });
      setSession(value);
      await emit("directus:auth:login", () =>
        Promise.resolve(nuxtApp.callHook("directus:auth:login", readonly(value)))
      );
    }
  };
}

/** Typed Nuxt app hooks emitted by the authentication facade. */
export interface DirectusAuthHooks {
  "directus:auth:login": (session: DirectusAuthSession) => void | Promise<void>;
  "directus:auth:refresh": (session: DirectusAuthSession) => void | Promise<void>;
  "directus:auth:logout": (userId: string | null) => void | Promise<void>;
  "directus:auth:invalidated": (userId: string | null) => void | Promise<void>;
}
