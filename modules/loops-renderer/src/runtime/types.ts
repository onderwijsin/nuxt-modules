import type { EvaluateLoopsLmxOptions } from "@onderwijsin/loops-core";

/** Options shared by the root renderer and every recursive LMX node renderer. */
export interface LoopsRendererConfig {
  /** Render unsupported nodes in the Nuxt development overlay. */
  debug?: boolean;
  /** Overrides the module default for applying LMX node styles inline. */
  applyInlineStyles?: boolean;
  /** Overrides the module defaults for conditional Section evaluation. */
  evaluate?: EvaluateLoopsLmxOptions;
}
