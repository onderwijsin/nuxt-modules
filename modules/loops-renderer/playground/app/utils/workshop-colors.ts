import { createLoopsColorMapper } from "#imports";
import type {
  LoopsRendererColorMap,
  LoopsRendererConfig,
  LoopsRendererTheme
} from "@onderwijsin/nuxt-loops-renderer";

const palette: LoopsRendererColorMap = {
  color: {
    "#0f172a": "var(--mail-heading)",
    "#334155": "var(--mail-text)",
    "#64748b": "var(--mail-muted)",
    "#2563eb": "var(--mail-link)",
    "#ffffff": "var(--mail-on-accent)"
  },
  backgroundColor: {
    "#ffffff": "var(--mail-paper)",
    "#eff6ff": "var(--mail-tint)",
    "#f8fafc": "var(--mail-panel)",
    "#2563eb": "var(--mail-accent)"
  },
  borderColor: {
    "#dbeafe": "var(--mail-border)",
    "#cbd5e1": "var(--mail-border)"
  }
};

/**
 * Creates consumer-owned theme policy using the public build-selected palette utility.
 * @param theme - Preview theme; the stored email is always authored in light mode.
 * @param maxDeltaE - Zero for exact-only matching, or a bounded approximation distance.
 * @returns Renderer settings without changing the email AST or its variables.
 */
export function createWorkshopConfig(
  theme: LoopsRendererTheme,
  maxDeltaE = 0
): LoopsRendererConfig {
  return {
    sourceTheme: "light",
    targetTheme: theme,
    mapColor: theme === "dark" ? createLoopsColorMapper(palette, { maxDeltaE }) : undefined
  };
}
