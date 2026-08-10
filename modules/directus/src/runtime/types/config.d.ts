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
      preview: {
        enabled: boolean;
        versioning: boolean;
        queryKeys: { preview: string; token: string; version: string; id: string };
      };
      auth: { enabled: boolean };
    };
  }
}

export {};
