import { normalizeCssColorToHex } from "../utils/color";
import { THEME_SHADES } from "../utils/theme";
import type { ThemeAppConfig } from "../types";

type RuntimeColor = {
  token: string;
  shades: Record<number, string>;
};

/**
 * Encapsulates browser CSS-variable reads and writes for the theme customizer.
 * @param appConfig Runtime application configuration whose active colors are updated.
 * @returns Runtime theme operations for reading and applying CSS theme tokens.
 */
export function createThemeRuntimeAdapter(appConfig: ThemeAppConfig) {
  function readDefaultShade(group: string, token: string, shade: number) {
    if (!import.meta.client) return "#ffffff";

    const activeToken = token || appConfig.ui.colors[group] || appConfig.ui.colors.primary;
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(`--color-${activeToken}-${shade}`)
      .trim();
    if (value.startsWith("#")) return value.toLowerCase();
    if (!value) return "#ffffff";

    const context = document.createElement("canvas").getContext("2d");
    return normalizeCssColorToHex(value, context) || "#ffffff";
  }

  function applyColor(color: RuntimeColor) {
    if (!import.meta.client) return;

    for (const shade of THEME_SHADES) {
      const value = color.shades[shade];
      if (value)
        document.documentElement.style.setProperty(`--color-${color.token}-${shade}`, value);
    }
  }

  function removeColorTokens(token: string | undefined) {
    if (!import.meta.client || !token) return;

    for (const shade of THEME_SHADES) {
      document.documentElement.style.removeProperty(`--color-${token}-${shade}`);
    }
  }

  function applyGroupColor(group: string, token: string) {
    if (!import.meta.client || !token) return;

    const semanticProperty = group === "neutral" ? undefined : `--ui-${group}`;
    for (const shade of THEME_SHADES) {
      const property = `--color-${group}-${shade}`;
      const uiProperty = `--ui-color-${group}-${shade}`;
      if (group === token) {
        document.documentElement.style.removeProperty(property);
        document.documentElement.style.removeProperty(uiProperty);
      } else {
        const value = `var(--color-${token}-${shade})`;
        document.documentElement.style.setProperty(property, value);
        document.documentElement.style.setProperty(uiProperty, value);
      }
    }

    if (semanticProperty) {
      if (group === token) {
        document.documentElement.style.removeProperty(semanticProperty);
      } else {
        document.documentElement.style.setProperty(semanticProperty, `var(--color-${token}-500)`);
      }
    }
  }

  function setActiveColor(group: string, token: string) {
    if (!token) return;
    appConfig.ui.colors[group] = token;
    applyGroupColor(group, token);
  }

  function removeGroup(group: string) {
    if (!import.meta.client) return;

    removeColorTokens(group);
    for (const shade of THEME_SHADES) {
      document.documentElement.style.removeProperty(`--ui-color-${group}-${shade}`);
    }
    if (group !== "neutral") document.documentElement.style.removeProperty(`--ui-${group}`);
  }

  return {
    applyColor,
    applyGroupColor,
    readDefaultShade,
    removeColorTokens,
    removeGroup,
    setActiveColor
  };
}
