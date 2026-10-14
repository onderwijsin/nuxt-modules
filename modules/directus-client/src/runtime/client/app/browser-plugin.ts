import { defineNuxtPlugin, refreshNuxtData } from "#app";
import { useRoute, useRouter, useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { createDirectusRestClient } from "@onderwijsin/nuxt-module-utils/shared";
import type { Schema } from "#directus";
import { DIRECTUS_PREVIEW_TOKEN_HEADER, parseDirectusPreviewContext } from "../../preview/context";

/**
 * Installs a browser-only Directus client that can reach the same-origin proxy.
 *
 * @param nuxtApp Nuxt application owning preview refreshes.
 * @returns The injected browser client.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();
  const preview = parseDirectusPreviewContext(
    useRoute().query,
    config.public.directusClient.preview
  );
  const origin = globalThis.location.origin;
  const proxyUrl = new URL(config.public.directusClient.proxy.path, origin);
  const directus = createDirectusRestClient<Schema>({
    baseUrl: proxyUrl.toString(),
    fetch: ofetch.create({
      credentials: "same-origin",
      onRequest({ request, options }) {
        options.headers.delete(DIRECTUS_PREVIEW_TOKEN_HEADER);
        const target = new URL(request instanceof Request ? request.url : request, origin);
        if (
          preview.token &&
          target.origin === proxyUrl.origin &&
          target.pathname.startsWith(`${proxyUrl.pathname.replace(/\/$/, "")}/`)
        ) {
          options.headers.set(DIRECTUS_PREVIEW_TOKEN_HEADER, preview.token);
        }
      }
    })
  });

  if (preview.isPreview) {
    nuxtApp.hook("page:finish", () => {
      void refreshNuxtData();
    });
  }

  if (preview.token) {
    const router = useRouter();
    nuxtApp.hook("app:mounted", async () => {
      const route = router.currentRoute.value;
      const query = { ...route.query };
      delete query[config.public.directusClient.preview.queryKeys.token];
      await router.replace({ path: route.path, query, hash: route.hash });
    });
  }

  return { provide: { directus } };
});
