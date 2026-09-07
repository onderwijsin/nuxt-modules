import { useAsyncData, useNuxtApp } from "#app";
import type { DirectusUserProjection } from "#directus-user";
import { useDirectusAuth } from "../../auth/app/use-directus-auth";

/**
 * Provides the opt-in mutable current-user projection independently of auth session state.
 * @returns Shared current-user async-data state and its refresh operation.
 */
export function useDirectusUser() {
  const auth = useDirectusAuth();
  const nuxtApp = useNuxtApp();
  const asyncData = useAsyncData<DirectusUserProjection | null>(
    "directus:user",
    () => nuxtApp.$directusUser(),
    { default: () => null, immediate: auth.isAuthenticated.value }
  );

  return {
    user: asyncData.data,
    status: asyncData.status,
    error: asyncData.error,
    refresh: asyncData.refresh
  };
}
