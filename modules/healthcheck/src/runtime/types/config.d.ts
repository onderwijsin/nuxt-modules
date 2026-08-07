import type { HealthcheckRuntimeConfig } from "../../types/config";

declare module "@nuxt/schema" {
  interface RuntimeConfig {
    healthcheck: HealthcheckRuntimeConfig;
  }
}

declare module "nuxt/schema" {
  interface RuntimeConfig {
    healthcheck: HealthcheckRuntimeConfig;
  }
}

export {};
