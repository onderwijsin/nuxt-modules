declare module "nuxt/schema" {
  interface RuntimeConfig {
    directus: {
      baseUrl: string;
      staticToken?: string;
      typegen: { introspectionToken?: string };
      auth: {
        enabled: boolean;
        cookie: {
          name: string;
          secure: boolean;
          sameSite: "lax" | "strict" | "none";
          path: string;
          maxAge: number;
          domain?: string;
        };
        refreshSafetyWindow: number;
        passwordResetUrl?: string;
      };
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
