declare module "nuxt/schema" {
  interface RuntimeConfig {
    healthcheck: {
      enabled: boolean;
      timeoutMs: number;
      cache: {
        enabled: boolean;
        threshold?: { warn?: number; error?: number };
        timeoutMs?: number;
      };
      cloudinary: {
        enabled: boolean;
        cloudName?: string;
        apiKey?: string;
        apiSecret?: string;
        threshold?: { warn?: number; error?: number };
        timeoutMs?: number;
      };
      directus: {
        enabled: boolean;
        baseUrl?: string;
        threshold?: { warn?: number; error?: number };
        timeoutMs?: number;
      };
    };
  }
}

export {};
