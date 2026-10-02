declare module "#markdown-renderer/manifest" {
  import type { ComponentManifest } from "comark";

  export const componentSets: Record<string, string[]>;
  export const rendererComponentNames: string[];
  export const resolveRendererComponent: (
    name: string,
    componentSet?: string
  ) => ReturnType<ComponentManifest>;
}

declare module "nuxt/schema" {
  interface AppConfig {
    markdownRenderer: {
      videoBaseUrl?: string;
    };
  }
}

export {};
