import { computed, readonly, type ComputedRef, type DeepReadonly, type Ref } from "vue";
import { useNuxtApp, useState } from "#app";
import { $fetch } from "#imports";

import type { DirectusSessionSnapshot } from "../../server/utils/session";

/** Token-free session payload delivered to Directus authentication hooks. */
export type DirectusAuthSession = DeepReadonly<DirectusSessionSnapshot>;

/** Client-safe authentication facade. Tokens remain exclusively in the httpOnly cookie. */
export interface DirectusAuthFacade {
  readonly _session: DeepReadonly<Ref<DirectusSessionSnapshot | null>>;
  readonly isAuthenticated: DeepReadonly<ComputedRef<boolean>>;
  readonly userId: DeepReadonly<ComputedRef<string | undefined>>;
  readonly login: (input: { email: string; password: string; otp?: string }) => Promise<void>;
  readonly refresh: () => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly passwordRequest: (email: string) => Promise<void>;
  readonly passwordReset: (token: string, password: string) => Promise<void>;
}

/**
 * Provides a reactive projection of the server-owned Directus session.
 * @returns The client-safe authentication facade.
 */
export function useDirectusAuth(): DirectusAuthFacade {
  const nuxtApp = useNuxtApp();
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  const setSession = (value: DirectusSessionSnapshot | null): void => {
    session.value = value;
  };
  const emit = async (
    name: keyof DirectusAuthHooks,
    callback: () => Promise<void>
  ): Promise<void> => {
    try {
      await callback();
    } catch (error) {
      console.error(`Directus authentication hook failed: ${name}`, error);
    }
  };
  const sessionView = readonly(session);
  const authenticatedView = readonly(computed(() => session.value !== null));
  const userIdView = readonly(computed(() => session.value?.userId));
  return {
    _session: sessionView,
    isAuthenticated: authenticatedView,
    userId: userIdView,
    login: async (input): Promise<void> => {
      const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/login", {
        method: "POST",
        body: input
      });
      setSession(value);
      await emit("directus:auth:login", () =>
        Promise.resolve(nuxtApp.callHook("directus:auth:login", readonly(value)))
      );
    },
    refresh: async (): Promise<void> => {
      try {
        const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/refresh", {
          method: "POST"
        });
        setSession(value);
        await emit("directus:auth:refresh", () =>
          Promise.resolve(nuxtApp.callHook("directus:auth:refresh", readonly(value)))
        );
      } catch (error) {
        const previousUserId = session.value?.userId ?? null;
        setSession(null);
        await emit("directus:auth:invalidated", () =>
          Promise.resolve(nuxtApp.callHook("directus:auth:invalidated", previousUserId))
        );
        throw error;
      }
    },
    logout: async (): Promise<void> => {
      const previousUserId = session.value?.userId ?? null;
      try {
        await $fetch("/_directus/auth/logout", { method: "POST" });
      } finally {
        setSession(null);
        await emit("directus:auth:logout", () =>
          Promise.resolve(nuxtApp.callHook("directus:auth:logout", previousUserId))
        );
      }
    },
    passwordRequest: async (email): Promise<void> => {
      await $fetch("/_directus/auth/password-request", { method: "POST", body: { email } });
    },
    passwordReset: async (token, password): Promise<void> => {
      await $fetch("/_directus/auth/password-reset", {
        method: "POST",
        body: { token, password }
      });
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
