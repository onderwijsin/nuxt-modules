import { describe, expect, it } from "vitest";

import { generatePwaIcons } from "../src/utils/generate-icons";
import { generateWebManifest, resolveIconConfig } from "../src/utils";

const baseOptions = {
  enabled: true,
  icons: { favicon: "/icons/favicon", appIcon: "/icons/app", maskableAppIcon: "/icons/maskable" },
  manifest: {}
};
const nuxt = (overrides: Record<string, unknown> = {}) => ({
  options: {
    schemaOrg: {
      identity: {
        name: "Schema app",
        alternateName: "SA",
        description: "A schema app",
        keywords: ["education"]
      }
    },
    site: {
      url: "https://site.example",
      name: "Site app",
      description: "A site",
      currentLocale: "en"
    },
    image: { provider: "ipx" },
    runtimeConfig: { public: { siteUrl: "https://runtime.example" } },
    app: { head: { htmlAttrs: { lang: "en" } } },
    ...overrides
  }
});

describe("webmanifest utilities", () => {
  it("uses useful Site Config and Schema.org identity fields", () => {
    const manifest = generateWebManifest(baseOptions, nuxt() as never);
    expect(manifest.name).toBe("Schema app");
    expect(manifest.short_name).toBe("SA");
    expect(manifest.description).toBe("A schema app");
    expect(manifest.categories).toEqual(["education"]);
    expect(manifest.start_url).toBe("https://site.example?source=pwa");
    expect(manifest.lang).toBe("en");
  });

  it("generates IPX icons when Nuxt Image uses the IPX provider", () => {
    const manifest = generateWebManifest(baseOptions, nuxt() as never);
    expect(manifest.icons?.[0]).toMatchObject({
      src: "/_ipx/w_16,h_16,c_scale/icons/app.png",
      type: "image/png"
    });
  });

  it("uses Nuxt Image Cloudinary baseURL", () => {
    const value = nuxt({
      image: {
        provider: "cloudinary",
        cloudinary: { baseURL: "https://res.cloudinary.com/demo/image/upload/" }
      }
    });
    expect(generateWebManifest(baseOptions, value as never).icons?.[0]?.src).toContain(
      "https://res.cloudinary.com/demo/image/upload/w_16,h_16,c_scale/icons/app.png"
    );
  });

  it("uses explicitly supplied icons without generating replacements", () => {
    const icons = [{ src: "/brand.png", sizes: "512x512", type: "image/png" }];
    const manifest = generateWebManifest({ enabled: true, manifest: { icons } }, nuxt() as never);
    expect(manifest.icons).toEqual(icons);
  });

  it("falls back between favicon, appIcon, and maskableAppIcon", () => {
    const appFallback = resolveIconConfig(
      { enabled: true, icons: { appIcon: "/app" }, manifest: {} },
      nuxt() as never
    );
    expect(appFallback.config?.appIcon).toBe("/app");
    expect(appFallback.warnings[0]).toContain("favicon");

    const maskableFallback = resolveIconConfig(
      { enabled: true, icons: { maskableAppIcon: "/maskable" }, manifest: {} },
      nuxt() as never
    );
    expect(maskableFallback.config?.appIcon).toBe("/maskable");
    expect(maskableFallback.config?.maskableAppIcon).toBe("/maskable");
  });

  it("omits maskable entries when maskableAppIcon is missing", () => {
    const manifest = generateWebManifest(
      { enabled: true, icons: { appIcon: "/app" }, manifest: {} },
      nuxt() as never
    );
    expect(manifest.icons?.every((icon) => icon.purpose === "any")).toBe(true);
  });

  it("skips generation for unsupported providers", () => {
    const resolution = resolveIconConfig(
      baseOptions,
      nuxt({ image: { provider: "foo" } }) as never
    );
    expect(resolution.config).toBeUndefined();
    expect(resolution.warnings[0]).toContain("supported provider");
    expect(
      generateWebManifest(baseOptions, nuxt({ image: { provider: "foo" } }) as never).icons
    ).toEqual([]);
  });

  it("adds generated shortcut icons only when a shortcut has none", () => {
    const manifest = generateWebManifest(
      {
        ...baseOptions,
        manifest: {
          shortcuts: [
            { name: "News", url: "/news" },
            { name: "Custom", url: "/custom", icons: [{ src: "/custom.png" }] }
          ]
        }
      },
      nuxt() as never
    );
    expect(manifest.shortcuts?.[0]?.icons).toHaveLength(2);
    expect(manifest.shortcuts?.[1]?.icons).toEqual([{ src: "/custom.png" }]);
  });

  it("creates valid icon entries directly", () => {
    const icons = generatePwaIcons({
      sizes: [192],
      formats: ["png"],
      config: { provider: "ipx", appIcon: "/app", maskableAppIcon: "/maskable" }
    });
    expect(icons).toHaveLength(2);
    expect(icons[1]?.purpose).toBe("maskable");
  });
});
