declare module "nuxt/schema" {
  interface RuntimeConfig {
    simpleRateLimiter: {
      global: {
        enabled: boolean;
        pruning: {
          enabled: boolean;
          staleAfter: number;
        };
      };
    };
  }
}

export {};
