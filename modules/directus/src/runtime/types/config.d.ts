declare module "nuxt/schema" {
  interface RuntimeConfig {
    directus: {
      baseUrl: string;
      staticToken?: string;
      typegen: { introspectionToken?: string };
    };
  }

  interface PublicRuntimeConfig {
    directus: {
      proxy: { path: string };
      auth: { enabled: boolean };
    };
  }
}

export {};
