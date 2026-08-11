import type { Nuxt } from "@nuxt/schema";
import defu from "defu";
import { hasKey, isArray, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

import type { WebManifest, WebManifestShortcut } from "../types/manifest";
import type { ModuleOptions } from "../types/options";
import { generatePwaIcons } from "./generate-icons";

/** Resolved icon source configuration used by the manifest generator. */
export interface ResolvedIconConfig {
  provider?: "cloudinary" | "ipx";
  appIcon: string;
  maskableAppIcon?: string;
  favicon: string;
  baseURL?: string;
}

/** Icon configuration and warnings collected during module setup. */
export interface IconConfigResolution {
  config?: ResolvedIconConfig;
  warnings: string[];
}

function getString(value: unknown, key: string): string | undefined {
  if (!isRecord(value) || !hasKey(value, key)) return undefined;
  return isString(value[key]) ? value[key] : undefined;
}

function getStrings(value: unknown, key: string): string[] | undefined {
  if (!isRecord(value) || !hasKey(value, key)) return undefined;
  const field = value[key];
  if (isArray(field) && field.every(isString)) return field;
  if (isString(field))
    return field
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  return undefined;
}

/**
 * Resolve module icon options and report recoverable configuration problems.
 * @param options - Resolved webmanifest module options.
 * @param nuxt - The current Nuxt configuration.
 * @returns The resolved icon configuration and user-facing warnings.
 */
export function resolveIconConfig(options: ModuleOptions, nuxt: Nuxt): IconConfigResolution {
  const imageOptions = nuxt.options;

  if (!imageOptions.image || !isString(imageOptions.image.provider)) {
    return {
      warnings: [
        'Webmanifest icons were skipped because Nuxt Image is not configured. Configure image.provider as "ipx" or "cloudinary".'
      ]
    };
  }

  const provider = imageOptions.image.provider as "ipx" | "cloudinary";
  const warnings: string[] = [];

  if (provider !== "ipx" && provider !== "cloudinary") {
    return {
      warnings: [
        'Webmanifest icons were skipped because Nuxt Image has no supported provider. Configure image.provider as "ipx" or "cloudinary".'
      ]
    };
  }

  const configured = options.icons ?? {};
  let favicon = configured.favicon?.trim() ?? "";
  let appIcon = configured.appIcon?.trim() ?? "";
  const maskableAppIcon = configured.maskableAppIcon?.trim() || undefined;

  if (!favicon && appIcon) {
    favicon = appIcon;
    warnings.push("Webmanifest favicon is missing; using appIcon as the favicon fallback.");
  }
  if (!appIcon && favicon) {
    appIcon = favicon;
    warnings.push("Webmanifest appIcon is missing; using favicon as the appIcon fallback.");
  }
  if (!favicon && !appIcon && maskableAppIcon) {
    favicon = maskableAppIcon;
    appIcon = maskableAppIcon;
    warnings.push(
      "Webmanifest favicon and appIcon are missing; using maskableAppIcon as fallback."
    );
  }
  if (!maskableAppIcon) {
    warnings.push("Webmanifest maskableAppIcon is missing; maskable icons will be omitted.");
  }
  if (!appIcon) {
    warnings.push(
      "Webmanifest icons were skipped because no favicon, appIcon, or maskableAppIcon was configured."
    );
    return { warnings };
  }

  const baseURL = imageOptions.image?.cloudinary?.baseURL;
  if (provider === "cloudinary" && !baseURL) {
    return {
      warnings: [
        ...warnings,
        "Webmanifest icons were skipped because Nuxt Image Cloudinary baseURL is missing."
      ]
    };
  }

  return { config: { provider, appIcon, maskableAppIcon, favicon, baseURL }, warnings };
}

/**
 * Generate a consumer-visible manifest from module, Site Config, and Schema.org metadata.
 * @param options - Resolved webmanifest module options.
 * @param nuxt - The current Nuxt configuration.
 * @param iconResolution - Icon configuration resolved during module setup.
 * @returns The generated web app manifest.
 */
export function generateWebManifest(
  options: ModuleOptions,
  nuxt: Nuxt,
  iconResolution: IconConfigResolution = resolveIconConfig(options, nuxt)
): WebManifest {
  const nuxtOptions = nuxt.options;

  const identity = nuxtOptions.schemaOrg ? nuxtOptions.schemaOrg?.identity : undefined;
  const site = nuxtOptions.site ? nuxtOptions.site : undefined;
  const manifestFromIdentity: Partial<WebManifest> = {
    name: getString(identity, "name") ?? getString(identity, "alternateName"),
    short_name: getString(identity, "alternateName") ?? getString(identity, "name"),
    description: getString(identity, "description"),
    categories: getStrings(identity, "keywords")
  };
  const configuredAppUrl = site?.url ?? nuxt.options.runtimeConfig.public.siteUrl;
  const appUrl = isString(configuredAppUrl) ? configuredAppUrl : undefined;
  const configuredBaseURL = nuxt.options.app.baseURL;
  const baseURL = isString(configuredBaseURL) ? configuredBaseURL : "/";
  const normalizedBaseURL = `/${baseURL.replace(/^\/+|\/+$/gu, "")}/`.replace("//", "/");
  const scopedAppUrl = appUrl
    ? normalizedBaseURL === "/"
      ? appUrl
      : new URL(normalizedBaseURL, appUrl).toString()
    : normalizedBaseURL;
  const generatedIcons = iconResolution.config
    ? generatePwaIcons({
        sizes: [16, 32, 48, 96, 144, 192, 512],
        formats: ["png"],
        config: iconResolution.config
      })
    : [];
  const manifest = options.manifest ?? {};
  const manifestIcons = manifest.icons ?? generatedIcons;
  const shortcuts = (manifest.shortcuts ?? []).map((shortcut: WebManifestShortcut) =>
    shortcut.icons?.length || !iconResolution.config
      ? shortcut
      : {
          ...shortcut,
          icons: generatePwaIcons({ sizes: [96], formats: ["png"], config: iconResolution.config })
        }
  );

  return defu({ ...manifest, icons: manifestIcons, shortcuts }, manifestFromIdentity, {
    name: site?.name,
    description: site?.description,
    start_url: appUrl
      ? normalizedBaseURL === "/"
        ? `${appUrl.replace(/\/$/u, "")}?source=pwa`
        : new URL("?source=pwa", scopedAppUrl).toString()
      : `${scopedAppUrl}?source=pwa`,
    scope: scopedAppUrl,
    lang: nuxt.options.app.head?.htmlAttrs?.lang ?? site?.currentLocale ?? site?.defaultLocale
  }) as WebManifest;
}
