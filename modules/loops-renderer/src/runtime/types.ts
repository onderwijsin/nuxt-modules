import type { EvaluateLoopsLmxOptions } from "@onderwijsin/loops-core";

/** Authored or application-selected theme; the renderer never detects it automatically. */
export type LoopsRendererTheme = "light" | "dark";

/** Validated CSS color declarations supported by the renderer. */
export type LoopsRendererColorProperty = "color" | "backgroundColor" | "borderColor";

/** Original validated node colors, before any consumer mapping is applied. */
export type LoopsRendererColors = Readonly<Partial<Record<LoopsRendererColorProperty, string>>>;

/** Source context for consumer-owned color policy. All colors are unmapped source values. */
export interface LoopsRendererColorContext {
  readonly property: LoopsRendererColorProperty;
  readonly nodeType: "element";
  readonly nodeName: string;
  readonly colors: LoopsRendererColors;
  /** Nearest explicit background on this node or an ancestor; excludes host CSS. */
  readonly backgroundColor: string | undefined;
  /** Nearest explicit ancestor background, before this node's own background. */
  readonly parentBackgroundColor: string | undefined;
  readonly sourceTheme: LoopsRendererTheme | undefined;
  readonly targetTheme: LoopsRendererTheme | undefined;
}

/** Returns a trusted CSS color (including var(...)), or undefined to keep the original. */
export type LoopsRendererColorMapper = (
  color: string,
  context: LoopsRendererColorContext
) => string | undefined;

/** Consumer-owned source hex to trusted CSS color mappings, separated by CSS role. */
export type LoopsRendererColorMap = Partial<
  Record<LoopsRendererColorProperty, Readonly<Record<string, string>>>
>;

/** Options for the build-selected color mapper utility. */
export interface LoopsRendererColorMappingOptions {
  /** Maximum Euclidean OKLab distance; defaults to 0.03 when approximation is enabled. */
  maxDeltaE?: number;
}

/** Options shared by the root renderer and every recursive LMX node renderer. */
export interface LoopsRendererConfig {
  /** Apply validated authored styles; false also disables color mapping. */
  applyInlineStyles?: boolean;
  /** Conditional evaluation fallbacks. */
  evaluate?: EvaluateLoopsLmxOptions;
  /** Theme in which source colors were authored. Omitted means unknown. */
  sourceTheme?: LoopsRendererTheme;
  /** Render unsupported nodes in an inline developer-only block. */
  debug?: boolean;
  /** Application-owned target theme. Omitted themes remain unknown. */
  targetTheme?: LoopsRendererTheme;
  /** Runtime-only policy, applied after source validation to supported colors only. */
  mapColor?: LoopsRendererColorMapper;
}
