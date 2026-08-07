import type { WebManifest } from "./manifest";

/** Configuration for the webmanifest module. */
export interface ModuleOptions {
  /** Whether the module generates a manifest. @default true */
  enabled?: boolean;
  /** Source icon names used when the manifest does not provide explicit icons. */
  icons?: {
    /** Favicon source path or Cloudinary public ID. */
    favicon?: string;
    /** Regular application icon source path or Cloudinary public ID. */
    appIcon?: string;
    /** Maskable application icon source path or Cloudinary public ID. */
    maskableAppIcon?: string;
  };
  /** Manifest values. Explicit icons disable automatic icon generation. */
  manifest?: WebManifest;
}

export type ResolvedModuleOptions = Omit<Required<ModuleOptions>, "icons"> & {
  icons?: NonNullable<ModuleOptions["icons"]>;
};
