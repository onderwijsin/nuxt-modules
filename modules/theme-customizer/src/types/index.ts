import { THEME_SHADES } from "../runtime/app/utils/theme";

export { THEME_SHADES };
export type ThemeShade = (typeof THEME_SHADES)[number];
export type ThemePalette = Record<ThemeShade, string>;

export type ThemeColorGroups = Record<string, Record<string, ThemePalette>>;

/** A font family option displayed by the theme customizer. */
export type ThemeFontOption = {
  label: string;
  value: string;
};

/** Optional Google Fonts Developer API configuration. */
export type ThemeGoogleFontsOptions = {
  /** Google Fonts Developer API key used by the server-side font proxy. */
  apiKey?: string;
  /** Font families to use when no Google Fonts API key is configured. */
  families?: string[];
};

/** Per-client protection settings for the public theme API endpoints. */
export type ThemeCustomizerRateLimit = {
  /** Whether endpoint requests are limited. @default true */
  enabled?: boolean;
  /** Allowed requests per rolling window. */
  max?: number;
  /** Window duration in seconds. */
  duration?: number;
  /** Ban duration in seconds after the limit is exceeded. */
  ban?: number;
};

/** Default values used when initializing the theme customizer. */
export type ThemeCustomizerDefaults = {
  /** Default Google Font family; otherwise the first configured family is used. */
  font?: string;
  /** Default Nuxt UI radius in rem units. */
  radius?: number;
  /** Default palette token for a semantic color group. */
  [group: string]: string | number | undefined;
};

export type ThemeCustomizerOptions = {
  /** Enables the module outside development when set to `true`. */
  enabled?: boolean;
  /** Application-relative path for the theme editor page. @default "/thema" */
  route?: string;
  /** Named palettes for the primary semantic color group. */
  primary?: Record<string, ThemePalette>;
  /** Named palettes for the secondary semantic color group. */
  secondary?: Record<string, ThemePalette>;
  /** Named palettes for the neutral semantic color group. */
  neutral?: Record<string, ThemePalette>;
  /** Optional Google Fonts Developer API configuration. */
  googleFonts?: ThemeGoogleFontsOptions;
  /** Rate limits for the public palette and fonts endpoints. */
  rateLimit?: {
    palette?: ThemeCustomizerRateLimit;
    fonts?: ThemeCustomizerRateLimit;
  };
  /** Optional initial values for the theme customizer. */
  defaults?: ThemeCustomizerDefaults;
  [group: string]:
    | boolean
    | Record<string, ThemePalette>
    | ThemeGoogleFontsOptions
    | { palette?: ThemeCustomizerRateLimit; fonts?: ThemeCustomizerRateLimit }
    | ThemeCustomizerDefaults
    | string
    | undefined;
};
