import { useAsyncData } from "#app";
import { useDirectusAuth } from "../../auth/app/use-directus-auth";
import { fetchDirectusUser } from "./fetch-user";

/**
 * Fetches the authenticated Directus user independently of auth session state.
 * @returns Shared current-user async-data state and its refresh operation.
 */
export async function useDirectusUser() {
  const auth = useDirectusAuth();
  const asyncData = await useAsyncData<Record<string, unknown> | null>(
    "directus:user",
    fetchDirectusUser,
    {
      default: () => null,
      immediate: auth.isAuthenticated.value
    }
  );

  return {
    user: asyncData.data,
    status: asyncData.status,
    error: asyncData.error,
    refresh: asyncData.refresh
  };
}
