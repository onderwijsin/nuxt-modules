import type { EvaluateLoopsLmxOptions } from "@onderwijsin/loops-core";

export interface ModuleOptions {
  /** Indicates whether the module should register its runtime features. */
  enabled?: boolean;
  /** Enables inline styles derived from LMX node attributes by default. */
  applyInlineStyles?: boolean;
  /** Fallbacks used when conditional Section rules cannot be evaluated. */
  evaluate?: EvaluateLoopsLmxOptions;
}

/** Options shared by the root renderer and every recursive LMX node renderer. */
export interface LoopsRendererConfig {
  /** Render unsupported nodes in an inline developer-only block. */
  debug?: boolean;
  /** Overrides the module default for applying LMX node styles inline. */
  applyInlineStyles?: boolean;
  /** Overrides the module defaults for conditional Section evaluation. */
  evaluate?: EvaluateLoopsLmxOptions;
}
