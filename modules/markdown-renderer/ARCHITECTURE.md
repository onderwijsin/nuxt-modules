# Markdown renderer architecture

This is a maintainer map of the module's build-time and runtime paths. The public API and usage
examples live in [README.md](README.md).

## Rendering path

`src/module.ts` validates options, registers Comark and Nuxt UI, and connects the build-time and
runtime pieces. During Nuxt's `components:extend` hook, `src/config/components.ts` selects direct
children of the renderer directories, gives consumer components precedence over built-ins, and
generates a lazy manifest. `src/runtime/app/utils/component-manifest.ts` resolves Comark node names
against that manifest and optional component sets. `MarkdownRenderer.vue` uses the resolver to
render content. `src/runtime/app/utils/resolve-reference-path.ts` is only the default fallback for
the `MarkdownReference` component; an application can replace it through the module option.

## Editor metadata path

`src/schema/editor-component-schema.ts` owns the Zod contracts and all derived types for the
author-written macro input, its normalized enrichment, and the endpoint output. The app-side
`defineEditorComponentSchema` function is intentionally inert: its argument type comes from that
contract, while `nuxt-component-meta` extracts its call at build time.

`src/config/component-meta.ts` validates the extracted macro input and converts editor conveniences
such as `input` and `deprecated` to namespaced tags. Invalid macro input is reported through a build
warning with Zod's nested field path, then its overrides are omitted. The generated
`nuxt-component-meta` registry also contains Vue prop types, nested schemas, defaults, and JSDoc. On
the server, `src/runtime/server/utils/metadata.ts` recursively merges that inferred structure with
the namespaced enrichment and validates the resulting editor schema. Partial namespaced metadata
from `extendComponentMeta` remains supported. The special input definitions specify both their names
and supported inferred property types, plus any required per-input configuration. The server checks
these before applying a type override. Configured inputs are carried through the `specialInputType`
tag's `config` field in the endpoint output. `defineSpecialInput` derives the endpoint and macro
object schemas from each control's strict config schema, and the transformer forwards those
validated fields without a per-input mapping. String shorthand is allowed when the config schema
accepts an empty object. The checklist at the top of the schema file covers adding a control.
`component-metadata-handler.ts` handles CORS, component-set selection, and the HTTP response. The
endpoint returns an array of editor components; `Reference` is omitted because the Directus editor
owns that node.

Inference and merge precedence belong in `metadata.ts`, not in the Zod schemas: TypeScript supplies
the prop structure, and the macro only overrides editor-specific fields. The schemas validate each
stage and provide its TypeScript types. Keep app imports of this contract type-only so the editor
schema validator stays out of the client bundle. The build emits this shared contract to
`dist/schema/` so the published app declarations and server utilities resolve the same schema.
