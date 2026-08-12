declare module "nuxt/schema" {
  interface RuntimeConfig {
    directusClient: {
      baseUrl: string;
      staticToken?: string;
      typegen: { introspectionToken?: string };
      auth: {
        enabled: boolean;
        turnstile: {
          enabled: boolean;
          actions: { login: string; passwordRequest: string };
        };
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
    directusClient: {
      proxy: { path: string };
      preview: {
        enabled: boolean;
        versioning: boolean;
        queryKeys: { preview: string; token: string; version: string; id: string };
      };
      auth: {
        enabled: boolean;
        turnstile: {
          enabled: boolean;
          actions: { login: string; passwordRequest: string };
        };
      };
    };
  }
}

export {};
