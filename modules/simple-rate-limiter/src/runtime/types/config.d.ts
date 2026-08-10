interface SimpleRateLimiterRuntimeConfig {
  global: {
    enabled: boolean;
    pruning: {
      enabled: boolean;
      staleAfter: number;
    };
  };
}

declare module "nuxt/schema" {
  interface RuntimeConfig {
    simpleRateLimiter: SimpleRateLimiterRuntimeConfig;
  }
}

export {};
