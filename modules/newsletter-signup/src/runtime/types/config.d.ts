declare module "nuxt/schema" {
  interface RuntimeConfig {
    newsletterSignup: {
      provider?: "loops" | "mailchimp";
      apiKey?: string;
      endpoint?: {
        enabled?: boolean;
        url?: string;
      };
      server?: string;
      lists?: {
        default?: string;
        options?: Array<{ label: string; id: string; server?: string }>;
      };
      fields?: Record<string, { target?: string; required?: boolean }>;
    };
  }

  interface PublicRuntimeConfig {
    newsletterSignup: {
      endpoint: {
        url: string;
      };
      lists?: {
        default?: string;
        options?: Array<{ label: string; id: string }>;
      };
    };
  }
}

export {};
