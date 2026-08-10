import type { RedirectIndex, ResolvedRedirect } from "../../../types/redirect";

import { $fetch } from "ofetch";
import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { useRuntimeConfig } from "#app";

import { toRedirectOrigin, toRedirectPath } from "../../server/utils/path";

interface RedirectIndexResponse {
  data: RedirectIndex;
}

/** Holds the serializable client index and a derived Map for constant-time redirect lookups. */
export const useRedirectsStore = defineStore(
  "redirects",
  () => {
    const records = shallowRef<RedirectIndex>({});
    const redirects = computed(() => new Map(Object.entries(records.value)));
    const lastFetched = shallowRef<number | null>(null);
    const isRefreshing = shallowRef(false);

    async function refresh(force = false): Promise<void> {
      const config = useRuntimeConfig().public.redirects;
      const intervalMs = (config?.storeRefreshInterval ?? 0) * 1000;
      if (
        isRefreshing.value ||
        (!force && lastFetched.value && Date.now() - lastFetched.value < intervalMs)
      ) {
        return;
      }

      isRefreshing.value = true;
      try {
        const response = await $fetch<RedirectIndexResponse>("/api/_redirects");
        records.value = response.data;
        lastFetched.value = Date.now();
      } finally {
        isRefreshing.value = false;
      }
    }

    function find(origin: string): ResolvedRedirect | null {
      const canonicalOrigin = toRedirectOrigin(origin);
      return (
        redirects.value.get(canonicalOrigin) ??
        redirects.value.get(toRedirectPath(canonicalOrigin)) ??
        null
      );
    }

    return { records, redirects, lastFetched, isRefreshing, refresh, find };
  },
  {
    persist: {
      pick: ["records", "lastFetched"]
    }
  }
);
