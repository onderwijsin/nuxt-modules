import type { EditorComponentInput } from "../../../schema/editor-component-schema";

/**
 * Defines editor metadata for a Markdown component.
 *
 * This is a compiler macro registered with `nuxt-component-meta`; its call is extracted at build
 * time. The implementation is intentionally inert in case tooling evaluates the module directly.
 * @param metadata Markdown editor metadata extracted during the Nuxt build.
 */
export function defineEditorComponentSchema(metadata: EditorComponentInput): void {
  void metadata;
}
