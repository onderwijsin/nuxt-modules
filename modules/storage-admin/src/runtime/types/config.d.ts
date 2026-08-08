declare module "nuxt/schema" {
  interface RuntimeConfig {
    storageAdmin?: {
      enabled: boolean;
      adminToken?: string;
      adminHeaderName: string;
      internalKeyPrefixes: string[];
      internalKeySuffixes: string[];
      mounts: Record<
        string,
        {
          permissions: Array<"read" | "write" | "delete">;
          prefixes: string[];
          allowRoot: boolean;
        }
      >;
      ui: {
        enabled: boolean;
        path: string;
      };
      defaultLimit: number;
      maxLimit: number;
      maxScanKeys: number;
      metadataConcurrency: number;
      listTimeoutMs: number;
    };
  }
}

export {};
