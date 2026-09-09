import { useAsyncData } from "#app";
import type { AsyncDataRequestStatus, NuxtError } from "#app";
import type { AsyncDataExecuteOptions } from "#app/composables/asyncData";
import type { DirectusUserResponse } from "#directus-user";
import type { Ref } from "vue";
import { useDirectusAuth } from "../../auth/app/use-directus-auth";
import { fetchDirectusUser } from "./fetch-user";

/** Reactive current-user state exposed to the consuming application. */
interface DirectusUserState {
  user: Ref<DirectusUserResponse | null>;
  status: Ref<AsyncDataRequestStatus>;
  error: Ref<NuxtError<unknown> | undefined>;
  refresh: (options?: AsyncDataExecuteOptions) => Promise<void>;
}

/**
 * Fetches the authenticated Directus user independently of auth session state.
 * @returns Shared current-user async-data state and its refresh operation.
 */
export function useDirectusUser(): DirectusUserState {
  const auth = useDirectusAuth();
  const asyncData = useAsyncData("directus:user", fetchDirectusUser, {
    default: () => null,
    immediate: auth.isAuthenticated.value
  });

  return {
    user: asyncData.data,
    status: asyncData.status,
    error: asyncData.error,
    refresh: asyncData.refresh
  };
}
