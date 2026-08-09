declare module "nuxt/schema" {
  interface RuntimeConfig {
    nuxtCache?: {
      enabled: boolean;
      adminToken?: string;
      adminHeaderName: string;
      devAuthBypass: boolean;
      maxInvalidatedEntries: number;
    };
  }
}

export {};
