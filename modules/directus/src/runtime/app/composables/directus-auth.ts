import { computed, readonly, type ComputedRef, type DeepReadonly, type Ref } from "vue";
import { useState } from "#app";
import { $fetch } from "#imports";

import type { DirectusSessionSnapshot } from "../../server/utils/session";

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
  const session = useState<DirectusSessionSnapshot | null>("directus:session", () => null);
  const setSession = (value: DirectusSessionSnapshot | null): void => {
    session.value = value;
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
    },
    refresh: async (): Promise<void> => {
      const value = await $fetch<DirectusSessionSnapshot>("/_directus/auth/refresh", {
        method: "POST"
      });
      setSession(value);
    },
    logout: async (): Promise<void> => {
      await $fetch("/_directus/auth/logout", { method: "POST" });
      setSession(null);
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
