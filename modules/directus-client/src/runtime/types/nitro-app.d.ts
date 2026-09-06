import type { DirectusAssetCacheState } from "../assets/cache";

declare module "nitropack/types" {
  interface NitroApp {
    directusAssetCache?: DirectusAssetCacheState;
  }
}

export {};
