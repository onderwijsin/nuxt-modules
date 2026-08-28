import type { DirectusSchemaClient } from "../server/utils/client";
import type { DirectusAuthHooks, DirectusAuthServer } from "../app/composables/directus-auth";

declare module "#app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
    $directusAuthServer: DirectusAuthServer | undefined;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

declare module "nuxt/app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
    $directusAuthServer: DirectusAuthServer | undefined;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

export {};
