# Changelog

## 0.2.3

### Patch Changes

- 2baaa95: Compile generated server entrypoints and their dependencies through Nitro in development and production so virtual runtime imports resolve correctly.

  Migration: no application code or configuration changes are required. Upgrade the affected modules
  you use, restart the Nuxt development server, and rebuild and redeploy production applications.
  Existing redirect sources, healthcheck components, metadata routes, and Directus user mappers keep
  their current APIs and configuration.

  If you replaced a Directus-backed redirect source with manual REST requests to avoid
  `ERR_PACKAGE_IMPORT_NOT_DEFINED` for `#imports`, you may switch back to the documented
  `@onderwijsin/nuxt-directus-client/runtime/server` entrypoint after upgrading
  `@onderwijsin/nuxt-redirects`. Keeping the REST source is also supported; removing that workaround
  is optional.

## 0.2.2

### Patch Changes

- 0381721: Use the application's Vue, Nuxt UI, and Comark peer dependencies to avoid separate SSR runtimes and missing Prose styling. Support Comark versions from 0.6.2; install matching Comark Nuxt, Vue, and core packages in the application.
- 0381721: Resolve the reserved Reference node regardless of the selected component set while keeping it excluded from component metadata endpoints.

## 0.2.1

### Patch Changes

- 499a4ee: Scope component metadata extraction and checker sources to renderer components by default, preserving packaged typed built-in metadata. Add `scopeComponentMeta: false` to retain global component-meta behavior when applications need unrelated component metadata.

## 0.2.0

### Minor Changes

- f85c985: Render Markdown with Comark, lazy built-in and consumer components, named component sets, reference
  path resolution, and Directus-editor metadata endpoints.
- f85c985: Allow cross-origin Directus component metadata requests, including browser preflight handling, and
  add a configurable `corsOrigin` allowlist that defaults to every origin.
- f85c985: Rename the top-level `defineEditorComponentSchema` macro field from `props` to `properties`. The generated component metadata and Directus endpoint still use `props`.
- f85c985: Add the typed `defineEditorComponentSchema` compiler macro for concise labels, node types, values,
  input controls, and deprecation metadata.
- f85c985: Preserve nested object and array prop structure in editor metadata, support recursive editor input overrides with per-input configuration under the `specialInputType` tag, validate special inputs against inferred prop types, accept string deprecation guidance, and warn during builds when macro fields are invalid.
- f85c985: Add the initial MarkdownRenderer Nuxt module scaffold and component.
- f85c985: Rename the editor metadata compiler macro from `extendMarkdownComponent` to
  `defineEditorComponentSchema`.

### Patch Changes

- f85c985: Preserve built-in renderer prop descriptions, defaults, slots, nested action schemas, and editor tags by generating metadata from packaged typed component sources. Accept numeric-keyed array item schemas emitted by component metadata extraction.
- f85c985: Resolve kebab-case Comark component names so Markdown renderer components load correctly.
- f85c985: Keep the optional video-source plugin lazily imported and document video base URLs and custom plugin composition.
- f85c985: Stabilize consumer renderer names from component filenames, correctly route named metadata sets,
  and normalize props with explicit string choices to string editor inputs.
- f85c985: Restore generated editor metadata for the prefixed Markdown renderer components and use the
  `nuxt-component-meta` auto-import for component metadata extensions.
- f85c985: Exclude Schema.org virtual components from metadata scanning so Nuxt preparation succeeds alongside webmanifest.

## 0.1.0

- Add the initial Markdown renderer module boilerplate and component.
