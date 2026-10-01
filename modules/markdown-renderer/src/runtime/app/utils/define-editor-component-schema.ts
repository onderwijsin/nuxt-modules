export interface MarkdownComponentDeprecation {
  /** Migration guidance displayed alongside the deprecated hint. */
  text: string;
}

export interface MarkdownComponentPropertyMetadata {
  /** Explicit choices when they cannot be inferred from the prop's TypeScript type. */
  values?: string[];
  /** Rich Directus control to use for a string prop. */
  input?: "image" | "url";
  /** Marks the prop as deprecated, optionally with migration guidance. */
  deprecated?: boolean | MarkdownComponentDeprecation;
  /** Overrides the primitive editor type inferred from TypeScript. */
  type?: "array" | "boolean" | "number" | "string";
  /** Overrides the description inferred from JSDoc. */
  description?: string;
  /** Overrides the default inferred from the Vue prop declaration. */
  default?: unknown;
  /** Overrides whether the editor requires the prop. */
  required?: boolean;
}

export interface MarkdownComponentMetadata {
  /** Human-facing label shown in the Markdown editor. */
  label: string;
  /** Explanation shown while selecting the component. */
  description?: string;
  /** Whether the component is inserted as an inline or block MDC node. */
  type: "block" | "inline";
  /** Marks the component as deprecated, optionally with migration guidance. */
  deprecated?: boolean | MarkdownComponentDeprecation;
  /** Editor-specific overrides keyed by Vue prop name. */
  props?: Record<string, MarkdownComponentPropertyMetadata>;
}

/**
 * Defines editor metadata for a Markdown component.
 *
 * This is a compiler macro registered with `nuxt-component-meta`; its call is extracted at build
 * time. The implementation is intentionally inert in case tooling evaluates the module directly.
 * @param metadata Markdown editor metadata extracted during the Nuxt build.
 */
export function defineEditorComponentSchema(metadata: MarkdownComponentMetadata): void {
  void metadata;
}
