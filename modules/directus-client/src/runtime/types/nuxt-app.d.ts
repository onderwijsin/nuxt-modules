import type { DirectusSchemaClient } from "../client/server/create-client";
import type { DirectusAuthHooks } from "../auth/app/use-directus-auth";
import type { DirectusUserProjection } from "#directus-user";

declare module "#app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
    $directusUser: () => Promise<DirectusUserProjection>;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

declare module "nuxt/app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
    $directusUser: () => Promise<DirectusUserProjection>;
  }

  interface RuntimeNuxtHooks extends DirectusAuthHooks {}
}

export {};
