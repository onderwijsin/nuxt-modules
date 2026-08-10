import type { DirectusSchemaClient } from "../server/utils/client";

declare module "#app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
  }
}

declare module "nuxt/app" {
  interface NuxtApp {
    $directus: DirectusSchemaClient;
  }
}

export {};
