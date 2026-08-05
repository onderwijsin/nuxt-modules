import type {} from "pinia-plugin-persistedstate";
import { defineStore } from "pinia";
import { kebabCase, titleCase } from "scule";
import { reactive, ref } from "#imports";
import { useAppConfig, useRuntimeConfig } from "nuxt/app";

import { createThemeRuntimeAdapter } from "../adapters/theme-runtime.client";
import { builtInDefaultTokens, THEME_SHADES } from "../utils/theme";

import { piniaPluginPersistedstate } from "#imports";
import { applyThemeFont, DEFAULT_THEME_FONT, sanitizeFontFamily } from "../utils/font";
import type { ThemeAppConfig, ThemeCustomizerRuntimeConfig } from "../types";

import type { ThemeShade } from "../types";
export type ThemeColorGroup = string;

export type CustomThemeColor = {
  id: string;
  name: string;
  group: ThemeColorGroup;
  token: string;
  shades: Record<ThemeShade, string>;
};

type PersistedThemeColor = CustomThemeColor & { role?: ThemeColorGroup };

/**
 * Stores persisted custom theme colors and applies their runtime CSS variables.
 * @returns A Pinia store definition for persisted theme customization state.
 */
export const useThemeCustomizerStore = defineStore(
  "themeCustomizer",
  () => {
    const colors = ref<PersistedThemeColor[]>([]);
    const groups = ref<ThemeColorGroup[]>([]);
    const activeColors = reactive<Record<ThemeColorGroup, string>>({});
    const font = ref(DEFAULT_THEME_FONT);

    const appConfig = useAppConfig() as unknown as ThemeAppConfig;
    const runtimeConfig = useRuntimeConfig() as unknown as ThemeCustomizerRuntimeConfig;
    const runtime = createThemeRuntimeAdapter(appConfig);

    /**
     * Returns all color groups configured for the current theme.
     * @returns Unique configured and runtime-created theme groups.
     */
    function colorGroups() {
      return [
        ...new Set([...Object.keys(runtimeConfig.public.themeCustomizer.groups), ...groups.value])
      ];
    }

    /**
     * Gets the initial palette token for a group when no selection is persisted.
     * @param group Theme color group to inspect.
     * @returns The configured default token, or an empty string when none exists.
     */
    function defaultColor(group: ThemeColorGroup) {
      return (
        builtInDefaultTokens[group] ??
        runtimeConfig.public.themeCustomizer.groups[group]?.[0] ??
        appConfig.ui.colors[group] ??
        ""
      );
    }

    /**
     * Converts a color name into a valid, readable CSS token segment.
     * @param name Color name to convert.
     * @returns A sanitized kebab-case token segment.
     */
    function toTokenSegment(name: string) {
      const token = kebabCase(sanitizeColorName(name).replace(/\s+/g, "-"));
      return token.replace(/[^\p{L}\p{N}-]/gu, "").replace(/^-+|-+$/g, "") || "color";
    }

    /**
     * Removes punctuation while preserving letters, numbers, and word boundaries.
     * @param name Color name to sanitize.
     * @returns The sanitized color name.
     */
    function sanitizeColorName(name: string) {
      return name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
    }

    /**
     * Normalizes a custom color name for display and persistence.
     * @param name Color name to normalize.
     * @returns A title-cased display name.
     */
    function normalizeColorName(name: string) {
      return titleCase(sanitizeColorName(name).replace(/\s+/g, "-")).replace(/-/g, " ");
    }

    /**
     * Reads the current default shade from the runtime theme.
     * @param group Theme color group whose shade should be read.
     * @param shade Shade level to read.
     * @returns The shade as a six-digit lowercase hex value.
     */
    function readDefaultShade(group: ThemeColorGroup, shade: ThemeShade) {
      const token = activeColors[group] || defaultColor(group) || defaultColor("primary");
      return runtime.readDefaultShade(group, token, shade);
    }

    /**
     * Adds a persisted runtime color group and initializes it from the active primary palette.
     * @param name User-provided runtime group name.
     * @returns The normalized group token, or undefined when the name is empty.
     */
    function addGroup(name: string) {
      const sanitizedName = sanitizeColorName(name);
      if (!sanitizedName) return;

      const group = toTokenSegment(sanitizedName);
      if (!colorGroups().includes(group)) groups.value.push(group);

      const token = activeColors.primary || defaultColor("primary");
      if (token) setActiveColor(group, token);
      return group;
    }

    /**
     * Returns whether a group was created in the runtime customizer.
     * @param group Theme color group to inspect.
     * @returns Whether the group was created at runtime.
     */
    function isRuntimeGroup(group: ThemeColorGroup) {
      return groups.value.includes(group);
    }

    /**
     * Applies all persisted colors and restores the active semantic colors.
     * @returns Nothing.
     */
    function applyPersistedTheme() {
      const usedTokens = new Set<string>();

      for (const color of colors.value) {
        color.group ??= color.role ?? "primary";
        delete color.role;
        if (!colorGroups().includes(color.group)) groups.value.push(color.group);
        color.name = normalizeColorName(color.name);
        const baseToken = `custom-${toTokenSegment(color.group)}-${toTokenSegment(color.name)}`;
        let token = baseToken;
        let suffix = 2;

        while (usedTokens.has(token)) token = `${baseToken}-${suffix++}`;
        usedTokens.add(token);

        const previousToken = color.token;
        if (token !== previousToken) runtime.removeColorTokens(previousToken);

        color.token = token;
        if (activeColors[color.group] === previousToken) activeColors[color.group] = token;

        for (const shade of THEME_SHADES) {
          if (!color.shades[shade]) color.shades[shade] = readDefaultShade(color.group, shade);
        }

        runtime.applyColor(color);
      }

      for (const group of colorGroups()) {
        const token = activeColors[group] || defaultColor(group);
        if (token) setActiveColor(group, token);
      }

      applyThemeFont(font.value);
    }

    /**
     * Creates and persists a custom color initialized from the group's active palette.
     * @param name Display name for the custom color.
     * @param group Theme color group that owns the custom color.
     * @returns The newly created custom color.
     */
    function addColor(name: string, group: ThemeColorGroup) {
      const normalizedName = normalizeColorName(name);
      const baseToken = `custom-${toTokenSegment(group)}-${toTokenSegment(normalizedName)}`;
      const token = colors.value.some((color) => color.token === baseToken)
        ? `${baseToken}-${colors.value.length + 1}`
        : baseToken;
      const color: CustomThemeColor = {
        id: `${token}-${Date.now()}`,
        name: normalizedName,
        group,
        token,
        shades: Object.fromEntries(
          THEME_SHADES.map((shade) => [shade, readDefaultShade(group, shade)])
        ) as Record<ThemeShade, string>
      };

      colors.value.push(color);
      runtime.applyColor(color);
      return color as CustomThemeColor;
    }

    /**
     * Updates one shade and immediately writes the new value to the runtime theme.
     * @param id Persisted custom color identifier.
     * @param shade Shade level to update.
     * @param value New six-digit hex value.
     * @returns Nothing.
     */
    function updateShade(id: string, shade: ThemeShade, value: string) {
      const color = colors.value.find((item) => item.id === id);
      if (!color || !/^#[\da-f]{6}$/i.test(value)) return;

      color.shades[shade] = value.toLowerCase();
      runtime.applyColor(color);
    }

    /**
     * Removes a custom color and restores its group's default when it is active.
     * @param id Persisted custom color identifier.
     * @returns Nothing.
     */
    function removeColor(id: string) {
      const index = colors.value.findIndex((color) => color.id === id);
      const color = colors.value[index];
      if (!color) return;

      if (activeColors[color.group] === color.token) {
        setActiveColor(color.group, defaultColor(color.group));
      }

      runtime.removeColorTokens(color.token);

      colors.value.splice(index, 1);
    }

    /**
     * Removes a runtime group and every custom color that belongs to it.
     * @param group Runtime color group to remove.
     * @returns Whether a runtime group was removed.
     */
    function removeGroup(group: ThemeColorGroup) {
      if (!isRuntimeGroup(group)) return false;

      for (const color of colors.value) {
        if (color.group === group) runtime.removeColorTokens(color.token);
      }
      colors.value = colors.value.filter((color) => color.group !== group);
      groups.value = groups.value.filter((item) => item !== group);
      delete activeColors[group];
      delete appConfig.ui.colors[group];

      runtime.removeGroup(group);

      return true;
    }

    /**
     * Selects a built-in or custom color token for a theme group.
     * @param group Theme color group to update.
     * @param token Palette token to activate.
     * @returns Nothing.
     */
    function setActiveColor(group: ThemeColorGroup, token: string) {
      activeColors[group] = token;
      runtime.setActiveColor(group, token);
    }

    /**
     * Selects and applies a Google Font family.
     * @param value Font family to activate.
     * @returns Nothing; invalid family names are ignored.
     */
    function setFont(value: string) {
      const family = sanitizeFontFamily(value);
      if (!family) return;

      font.value = family;
      applyThemeFont(family);
    }

    return {
      activeColors,
      addColor,
      addGroup,
      applyPersistedTheme,
      colors,
      colorGroups,
      groups,
      isRuntimeGroup,
      removeColor,
      removeGroup,
      font,
      setFont,
      setActiveColor,
      updateShade
    };
  },
  {
    persist: {
      storage: piniaPluginPersistedstate.localStorage(),
      pick: ["colors", "groups", "activeColors", "font"]
    }
  }
);
