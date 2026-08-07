declare module "nuxt/schema" {
  interface RuntimeConfig {
    healthcheck: {
      enabled: boolean;
      cache: {
        enabled: boolean;
        threshold?: { warn?: number; error?: number };
      };
      cloudinary: {
        enabled: boolean;
        cloudName?: string;
        apiKey?: string;
        apiSecret?: string;
        threshold?: { warn?: number; error?: number };
      };
      directus: {
        enabled: boolean;
        baseUrl?: string;
        threshold?: { warn?: number; error?: number };
      };
    };
  }
}

export {};
