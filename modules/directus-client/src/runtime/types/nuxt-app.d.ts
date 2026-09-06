import type { DirectusSchemaClient } from "../client/server/create-client";
import type { DirectusAuthHooks } from "../auth/app/use-directus-auth";

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
