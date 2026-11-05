import {
  applyInlineStyles,
  type LoopsLmxElement,
  type LoopsLmxInlineStyles
} from "@onderwijsin/loops-core";
import type {
  LoopsRendererColorProperty,
  LoopsRendererColors,
  LoopsRendererConfig
} from "../../types";

const colorProperties: LoopsRendererColorProperty[] = ["color", "backgroundColor", "borderColor"];

/**
 * Validates source styles before applying trusted consumer color policy.
 *
 * @param node - The authored element to render.
 * @param config - Runtime renderer settings.
 * @param parentBackgroundColor - Nearest authored ancestor background, if known.
 * @returns Mapped styles and the unmapped background context for descendants.
 */
export function resolveLoopsRendererStyles(
  node: LoopsLmxElement,
  config: LoopsRendererConfig,
  parentBackgroundColor?: string
): { styles: LoopsLmxInlineStyles; backgroundColor: string | undefined } {
  const styles = applyInlineStyles(node.attributes, config.applyInlineStyles !== false);
  const backgroundColor = styles.backgroundColor ?? parentBackgroundColor;
  if (!config.mapColor) return { styles, backgroundColor };

  const colors: LoopsRendererColors = Object.freeze({
    ...(styles.color ? { color: styles.color } : {}),
    ...(styles.backgroundColor ? { backgroundColor: styles.backgroundColor } : {}),
    ...(styles.borderColor ? { borderColor: styles.borderColor } : {})
  });

  for (const property of colorProperties) {
    const color = colors[property];
    if (color === undefined) continue;
    styles[property] =
      config.mapColor(color, {
        property,
        nodeType: node.type,
        nodeName: node.name,
        colors,
        backgroundColor,
        parentBackgroundColor,
        sourceTheme: config.sourceTheme,
        targetTheme: config.targetTheme
      }) ?? color;
  }

  return { styles, backgroundColor };
}
