declare module "nuxt/schema" {
  interface RuntimeConfig {
    redirects?: {
      serverMiddleware: boolean;
      dynamicMatching: boolean;
      storageMount: string;
      excludedNamespaces: string[];
      excludedRoutes: string[];
      cache: {
        index: { maxAge: number; staleMaxAge: number; swr: boolean };
        lookup: { maxAge: number; staleMaxAge: number; swr: boolean };
      };
    };
  }

  interface PublicRuntimeConfig {
    redirects?: {
      store: boolean;
      routeMiddleware: boolean;
      dynamicMatching: boolean;
      storeRefreshInterval: number;
      excludedNamespaces: string[];
      excludedRoutes: string[];
    };
  }
}

export {};
