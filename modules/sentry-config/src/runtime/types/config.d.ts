declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    sentry: {
      dsn?: string;
      runtime: "node-server" | "cloudflare_module";
      testTools?: {
        endpoint?: string;
      };
    };
  }
}

export {};
