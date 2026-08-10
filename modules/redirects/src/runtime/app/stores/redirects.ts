import type { DynamicRedirectRule, RedirectIndex, ResolvedRedirect } from "../../../types/redirect";

import { $fetch } from "ofetch";
import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { useRuntimeConfig } from "#app";

import { toRedirectOrigin, toRedirectPath } from "../../server/utils/path";
import { compileDynamicRedirects, findCompiledDynamicRedirect } from "../../utils/dynamic";

interface RedirectIndexResponse {
  data: RedirectIndex;
  dynamic?: DynamicRedirectRule[];
}

/** Holds the serializable client index and a derived Map for constant-time redirect lookups. */
export const useRedirectsStore = defineStore(
  "redirects",
  () => {
    const records = shallowRef<RedirectIndex>({});
    const dynamicRules = shallowRef<DynamicRedirectRule[]>([]);
    const compiledDynamic = shallowRef(compileDynamicRedirects([]));
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
        dynamicRules.value = response.dynamic ?? [];
        compiledDynamic.value = compileDynamicRedirects(dynamicRules.value);
        lastFetched.value = Date.now();
      } finally {
        isRefreshing.value = false;
      }
    }

    function find(origin: string): ResolvedRedirect | null {
      const canonicalOrigin = toRedirectOrigin(origin);
      const exact = redirects.value.get(canonicalOrigin);
      if (exact) return exact;
      const pathOnly = redirects.value.get(toRedirectPath(canonicalOrigin));
      if (pathOnly) return pathOnly;
      if (!useRuntimeConfig().public.redirects?.dynamicMatching) return null;
      return findCompiledDynamicRedirect(compiledDynamic.value, toRedirectPath(canonicalOrigin));
    }

    return { records, dynamicRules, redirects, lastFetched, isRefreshing, refresh, find };
  },
  {
    persist: {
      pick: ["records", "lastFetched"]
    }
  }
);
