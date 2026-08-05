import { THEME_SHADES } from "../runtime/app/utils/theme";

export { THEME_SHADES };
export type ThemeShade = (typeof THEME_SHADES)[number];
export type ThemePalette = Record<ThemeShade, string>;

export type ThemeColorGroups = Record<string, Record<string, ThemePalette>>;

export type ThemeCustomizerOptions = {
  /** Enables the module outside development when set to `true`. */
  enabled?: boolean;
  /** Named palettes for the primary semantic color group. */
  primary?: Record<string, ThemePalette>;
  /** Named palettes for the secondary semantic color group. */
  secondary?: Record<string, ThemePalette>;
  /** Named palettes for the neutral semantic color group. */
  neutral?: Record<string, ThemePalette>;
  [group: string]: boolean | Record<string, ThemePalette> | undefined;
};
