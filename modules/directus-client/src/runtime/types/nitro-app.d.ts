import type { DirectusAssetCacheContext } from "../assets/cache";

declare module "nitropack/types" {
  interface NitroApp {
    directusAssetCache?: DirectusAssetCacheContext;
  }
}

export {};
