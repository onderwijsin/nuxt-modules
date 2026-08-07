declare module "@nuxt/schema" {
  interface RuntimeConfig {
    turnstile: {
      secretKey: string;
      adminToken: string;
      adminHeaderName: string;
    };
  }

  interface PublicRuntimeConfig {
    turnstile: { siteKey: string };
  }
}

export {};
