import type { DirectusSchemaClient } from "../server/utils/client";
import type { DirectusAuthHooks } from "../app/composables/directus-auth";

declare module "#app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

declare module "nuxt/app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

export {};
