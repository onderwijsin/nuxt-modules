declare module "nuxt/schema" {
  interface RuntimeConfig {
    cache?: {
      enabled: boolean;
      adminToken?: string;
      adminHeaderName: string;
      devAuthBypass: boolean;
      maxInvalidatedEntries: number;
    };
  }
}

export {};
