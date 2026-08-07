import type { HealthCheckThreshold } from "./health";

export interface HealthcheckComponentRuntimeConfig {
  enabled: boolean;
  threshold?: HealthCheckThreshold;
}

export interface CloudinaryRuntimeConfig extends HealthcheckComponentRuntimeConfig {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
}

export interface DirectusRuntimeConfig extends HealthcheckComponentRuntimeConfig {
  baseUrl?: string;
}

export interface HealthcheckRuntimeConfig {
  enabled: boolean;
  cache: HealthcheckComponentRuntimeConfig;
  cloudinary: CloudinaryRuntimeConfig;
  directus: DirectusRuntimeConfig;
}
