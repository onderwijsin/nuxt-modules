import { defu } from "defu";
import type { LoopsLmxAst, LoopsLmxNode } from "@onderwijsin/loops-core";
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

/**
 * Detects visible nodes handled by this renderer but intentionally omitted from core's generic
 * visibility helper. Quote and Br are renderer-specific LMX presentation nodes.
 *
 * @param nodes - Nodes in an LMX tree.
 * @returns Whether the tree contains renderer-specific visible content.
 */
export function hasRendererSpecificContent(nodes: LoopsLmxAst["children"]): boolean {
  return nodes.some(
    (node: LoopsLmxNode) =>
      node.type === "element" &&
      (["Quote", "Br"].includes(node.name) ||
        (node.name === "Component" && hasRendererSpecificContent(node.children)))
  );
}
