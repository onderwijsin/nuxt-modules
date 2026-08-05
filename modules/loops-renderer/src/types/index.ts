export interface ModuleOptions {
  /** Indicates whether the module should register its runtime features. */
  enabled?: boolean;
  /** Enables inline styles derived from LMX node attributes by default. */
  applyInlineStyles?: boolean;
}

/** Options shared by the root renderer and every recursive LMX node renderer. */
export interface LoopsRendererConfig {
  /** Render unsupported nodes in the Nuxt development overlay. */
  debug?: boolean;
  /** Overrides the module default for applying LMX node styles inline. */
  applyInlineStyles?: boolean;
}
