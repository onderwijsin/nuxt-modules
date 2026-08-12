import type { ModuleOptions } from "../config/options.schema";

/** Options shared by the root renderer and every recursive LMX node renderer. */
export type LoopsRendererConfig = Partial<Pick<ModuleOptions, "applyInlineStyles" | "evaluate">> & {
  /** Render unsupported nodes in an inline developer-only block. */
  debug?: boolean;
};
