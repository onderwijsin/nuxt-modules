declare module "nuxt/schema" {
  interface RuntimeConfig {
    directusClient: {
      baseUrl: string;
      proxyToken?: string;
      auth: {
        enabled: boolean;
        turnstile: {
          enabled: boolean;
          actions: { login: string; passwordRequest: string; magicLinkRequest: string };
        };
        magicLinks: { enabled: boolean; redirectUrl?: string };
        cookie: {
          name: string;
          secure: boolean;
          sameSite: "lax" | "strict" | "none";
          path: string;
          maxAge: number;
          domain?: string;
        };
        refreshSafetyWindow: number;
        sessionSecret: string;
        previousSessionSecrets: string[];
        maskSecretsInPlayground: boolean;
        passwordResetUrl?: string;
      };
      assets: {
        url?: string;
        publicOnly: boolean;
        cache:
          | { enabled: false }
          | {
              enabled: true;
              storage: string;
              maxAge: number;
              maxBodySize: number;
              swr: boolean;
              staleMaxAge?: number;
            };
      };
    };
  }

  interface PublicRuntimeConfig {
    directusClient: {
      proxy: { path: string };
      assets: { enabled: boolean; path: string };
      preview: {
        enabled: boolean;
        versioning: boolean;
        queryKeys: { preview: string; token: string; version: string; id: string };
      };
      auth: {
        enabled: boolean;
        magicLinks: { enabled: boolean };
        turnstile: {
          enabled: boolean;
          actions: { login: string; passwordRequest: string; magicLinkRequest: string };
        };
        maskSecretsInPlayground: boolean;
      };
    };
  }
}

export {};
