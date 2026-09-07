declare module "#directus-user" {
  export type DirectusUserProjection = Record<string, string | number | boolean | null | object>;
}

declare module "#directus-config-server" {
  import type { ResolvedDirectusConfig } from "@onderwijsin/nuxt-directus-config/schema";
  const config: ResolvedDirectusConfig;
  export default config;
}
