import { defu } from "defu";
import type { LoopsRendererConfig } from "../../types";

/**
 * Combines per-renderer settings, Nuxt app config, and safe renderer defaults.
 *
 * @param rendererConfig - Optional settings supplied to `LoopsRenderer`.
 * @param appConfig - Optional module settings from Nuxt app config.
 * @returns The effective renderer settings.
 */
export function createLoopsRendererConfig(
  rendererConfig?: LoopsRendererConfig,
  appConfig?: LoopsRendererConfig
): LoopsRendererConfig {
  return defu(rendererConfig, appConfig, {
    applyInlineStyles: true,
    evaluate: {
      onMissingVariable: false,
      onInvalidCondition: false,
      onInvalidComparison: false
    }
  });
}
