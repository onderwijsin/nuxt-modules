import type { Redirect } from "../../../types/redirect";

import {
  addRouteMiddleware,
  defineNuxtPlugin,
  navigateTo,
  onNuxtReady,
  useRuntimeConfig
} from "#app";
import { $fetch } from "ofetch";

import { useRedirectsStore } from "../stores/redirects";
import { createRedirectExclusionMatcher, isRedirectExcluded } from "../../utils/exclusions";
import { isExternalRedirectDestination, toRedirectDestination } from "../../utils/destination";

interface RedirectLookupResponse {
  data: Redirect | null;
}

function runWhenIdle(callback: () => void): void {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback);
    return;
  }
  globalThis.setTimeout(callback, 0);
}

/**
 * Initializes optional background index refresh and global client redirect handling.
 *
 * @param nuxtApp - Active Nuxt application instance.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.redirects;

  if (!config) return;
  const exclusions = createRedirectExclusionMatcher(config);

  const store = config.store ? useRedirectsStore(nuxtApp.$pinia) : null;
  if (store) {
    onNuxtReady(() => {
      runWhenIdle(() => void store.refresh(true));
      window.setInterval(
        () => runWhenIdle(() => void store.refresh()),
        config.storeRefreshInterval * 1000
      );
    });
  }
  if (!config.routeMiddleware) return;

  addRouteMiddleware(
    "redirects",
    async (to, from) => {
      if (to.fullPath === from.fullPath || isRedirectExcluded(to.path, exclusions)) return;

      const redirect = store
        ? store.find(to.fullPath)
        : (
            await $fetch<RedirectLookupResponse>(
              `/api/_redirects/${encodeURIComponent(to.fullPath)}`
            )
          ).data;
      if (!redirect) return;

      const destination = toRedirectDestination(redirect.to);
      return navigateTo(destination, {
        external: isExternalRedirectDestination(destination),
        redirectCode: redirect.statusCode ?? 302
      });
    },
    { global: true }
  );
});
