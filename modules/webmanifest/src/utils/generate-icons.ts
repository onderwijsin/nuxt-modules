import type { WebManifestIcon } from "../types/manifest";

type Size = 16 | 32 | 48 | 72 | 96 | 144 | 192 | 512;
type Format = "webp" | "png" | "ico" | "svg";

interface IconConfig {
  provider?: "cloudinary" | "ipx";
  favicon?: string;
  appIcon: string;
  maskableAppIcon?: string;
  cloudName?: string;
  baseURL?: string;
}

interface GenerationOptions {
  sizes: Size[];
  formats: Format[];
  config: IconConfig;
}

const getSizes = (size: Size) => `${size}x${size}`;

function getSource(config: IconConfig, source: string, size: Size, format: Format): string {
  const filename = /\.[a-z0-9]+$/i.test(source) ? source : `${source}.${format}`;
  if ((config.provider ?? "ipx") === "ipx") {
    const path = filename.startsWith("/") ? filename : `/${filename}`;
    return `/_ipx/w_${size},h_${size},c_scale${path}`;
  }

  const cloudinaryFilename = filename.replace(/^\/+/, "");
  return `${config.baseURL?.replace(/\/$/, "") ?? ""}/w_${size},h_${size},c_scale/${cloudinaryFilename}`;
}

function getImageType(source: string, format: Format): string {
  const extension = source.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  return `image/${extension ?? format}`;
}

/**
 * Generate manifest icon entries through Cloudinary or Nuxt Image's IPX endpoint.
 * @param root0 - Icon sizes, formats, and provider configuration.
 * @param root0.sizes - Icon sizes to generate.
 * @param root0.formats - Output image formats.
 * @param root0.config - Provider and source icon configuration.
 * @returns Generated manifest icon entries.
 */
export function generatePwaIcons({ sizes, formats, config }: GenerationOptions): WebManifestIcon[] {
  const icons: WebManifestIcon[] = [];
  for (const size of sizes) {
    for (const format of formats) {
      icons.push({
        src: getSource(config, config.appIcon, size, format),
        sizes: getSizes(size),
        type: getImageType(config.appIcon, format),
        purpose: "any"
      });
      if (config.maskableAppIcon) {
        icons.push({
          src: getSource(config, config.maskableAppIcon, size, format),
          sizes: getSizes(size),
          type: getImageType(config.maskableAppIcon, format),
          purpose: "maskable"
        });
      }
    }
  }
  return icons;
}

/**
 * Generate favicon link entries for consumers that reuse the icon configuration.
 * @param root0 - Icon sizes, formats, and provider configuration.
 * @param root0.sizes - Icon sizes to generate.
 * @param root0.formats - Output image formats.
 * @param root0.config - Provider and source icon configuration.
 * @returns Generated favicon link entries.
 */
export function generateFavicons({ sizes, formats, config }: GenerationOptions) {
  return sizes.flatMap((size) =>
    formats.map((format) => ({
      rel: "icon",
      type: `image/${format}`,
      sizes: getSizes(size),
      href: getSource(config, config.favicon ?? config.appIcon, size, format)
    }))
  );
}
