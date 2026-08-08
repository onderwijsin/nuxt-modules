import { builtInDefaultTokens, THEME_SHADES } from "../runtime/app/utils/theme";
import { fromEntries, toEntries } from "@onderwijsin/nuxt-module-utils/shared";
import type {
  ThemeColorGroups,
  ThemeCustomizerDefaults,
  ThemeCustomizerOptions,
  ThemePalette
} from "../types";
export { builtInDefaultTokens } from "../runtime/app/utils/theme";

const BUILT_IN_UI_COLORS = new Set([
  "primary",
  "secondary",
  "success",
  "info",
  "warning",
  "error",
  "neutral"
]);

function isThemeColorGroup(value: unknown): value is Record<string, ThemePalette> {
  return typeof value === "object" && value !== null;
}

/**
 * Returns configured named palettes while ignoring scalar module options.
 * @param options Validated theme customizer options.
 * @returns Configured palette groups.
 */
export function configuredGroups(options: ThemeCustomizerOptions): ThemeColorGroups {
  const groups: ThemeColorGroups = {};

  for (const [name, value] of toEntries(options)) {
    if (name !== "googleFonts" && name !== "defaults" && isThemeColorGroup(value)) {
      groups[name] = value;
    }
  }

  return groups;
}

/**
 * Returns the runtime group-to-palette mapping exposed to the application.
 * @param groups Configured theme groups.
 * @returns Group names and their configured palette tokens.
 */
export function configuredRuntimeGroups(groups: ThemeColorGroups) {
  return fromEntries(
    toEntries({
      primary: groups.primary ?? {},
      neutral: groups.neutral ?? {},
      ...groups
    }).map(([group, palettes]) => [group, Object.keys(palettes)])
  );
}

/**
 * Merges custom semantic groups into Nuxt UI's generated color list.
 * @param groups Configured theme groups.
 * @param colors Existing Nuxt UI color names.
 * @returns Unique Nuxt UI color names including configured custom groups.
 */
export function configuredUiColors(groups: ThemeColorGroups, colors: string[] = []) {
  return [
    ...colors,
    ...Object.keys(groups).filter((group) => !BUILT_IN_UI_COLORS.has(group))
  ].filter((group, index, allColors) => allColors.indexOf(group) === index);
}

/**
 * Merges configured defaults into Nuxt UI's application color configuration.
 * @param groups Configured theme groups.
 * @param colors Existing Nuxt UI semantic color tokens.
 * @param configuredDefaults Configured initial palette tokens by group.
 * @returns Nuxt UI semantic color tokens with module defaults applied.
 */
export function configuredAppColors(
  groups: ThemeColorGroups,
  colors: Record<string, string> = {},
  configuredDefaults: ThemeCustomizerDefaults = {}
) {
  const defaults = fromEntries(
    toEntries(groups).flatMap(([group, palettes]) => {
      const configuredToken = configuredDefaults[group];
      const token =
        typeof configuredToken === "string" && configuredToken in palettes
          ? configuredToken
          : (builtInDefaultTokens[group] ?? Object.keys(palettes)[0]);
      return token ? [[group, token]] : [];
    })
  );

  return { ...defaults, ...colors };
}

/**
 * Generates CSS variables for configured palettes and the active semantic aliases.
 * @param groups Configured palette groups.
 * @param neutralTheme Built-in neutral palette CSS.
 * @param configuredDefaults Configured initial palette tokens by group.
 * @returns Generated CSS containing palette tokens and group aliases.
 */
export function generateThemeCss(
  groups: ThemeColorGroups,
  neutralTheme: string,
  configuredDefaults: ThemeCustomizerDefaults = {}
): string {
  const tokens = Object.values(groups).flatMap((group) =>
    toEntries(group).flatMap(([name, palette]) =>
      THEME_SHADES.map((shade) => `  --color-${name}-${shade}: ${palette[shade]};`)
    )
  );
  const neutralRoot = neutralTheme.replace("@theme static", ":root");
  const groupTokens = toEntries(groups).flatMap(([group, palettes]) => {
    const configuredToken = configuredDefaults[group];
    const builtInToken = builtInDefaultTokens[group];
    const token =
      typeof configuredToken === "string" && configuredToken in palettes
        ? configuredToken
        : builtInToken && palettes[builtInToken]
          ? builtInToken
          : Object.keys(palettes)[0];
    if (!token || token === group) return [];

    return THEME_SHADES.map(
      (shade) => `  --color-${group}-${shade}: var(--color-${token}-${shade});`
    );
  });

  return [neutralRoot, `:root {\n${[...tokens, ...groupTokens].join("\n")}\n}`].join("\n\n");
}
