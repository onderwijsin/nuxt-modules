import type { DirectusSchemaClient } from "../client/server/create-client";
import type { DirectusAuthHooks } from "../auth/app/use-directus-auth";
import type { DirectusRequestAuthContext } from "../auth/types";

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
