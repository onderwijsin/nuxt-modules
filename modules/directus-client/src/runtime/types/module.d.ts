import type { DirectusSchemaClient } from "../server/utils/client";
import type { DirectusAuthHooks } from "../app/composables/directus-auth";
import type { DirectusRequestAuthContext } from "./auth";

declare module "h3" {
  interface H3EventContext {
    directusAuth?: DirectusRequestAuthContext;
  }
}

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
