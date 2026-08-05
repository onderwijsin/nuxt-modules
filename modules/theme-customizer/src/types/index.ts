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

export type ThemeCustomizerOptions = {
  /** Enables the module outside development when set to `true`. */
  enabled?: boolean;
  /** Named palettes for the primary semantic color group. */
  primary?: Record<string, ThemePalette>;
  /** Named palettes for the secondary semantic color group. */
  secondary?: Record<string, ThemePalette>;
  /** Named palettes for the neutral semantic color group. */
  neutral?: Record<string, ThemePalette>;
  /** Optional Google Fonts Developer API configuration. */
  googleFonts?: ThemeGoogleFontsOptions;
  [group: string]: boolean | Record<string, ThemePalette> | ThemeGoogleFontsOptions | undefined;
};
