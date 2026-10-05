# Reference links and troubleshooting

## Reference node and props

Stored Directus references use `Reference`, backed by the built-in `MarkdownReference` component.
Preserve that node name when changing implementation or application routes.

| Prop         | Type                      | Required | Purpose                               |
| ------------ | ------------------------- | -------- | ------------------------------------- |
| `collection` | `string`                  | yes      | Directus collection name.             |
| `item`       | `string`                  | yes      | Directus primary key.                 |
| `label`      | `string`                  | no       | Source display label.                 |
| `text`       | `string`                  | no       | Author-controlled display text.       |
| `icon`       | `string`                  | no       | Iconify icon name.                    |
| `data`       | `Record<string, unknown>` | no       | Source snapshot supplied by Directus. |

```md
Read :Reference{collection="articles" item="42" label="Getting started" text="the guide"}.
```

Display text is `text ?? label ?? ""`. Without a resolver, or when its result is `undefined`, the
reference remains plain text. The module never guesses application routes.

## Public resolver type

The `/runtime` entrypoint exports the `ResolveReferencePath` type:

```ts
type ResolveReferencePath = (
  collection: string,
  item: string,
  label?: string,
  text?: string,
  data?: Record<string, unknown>
) => string | undefined;
```

The resolver is synchronous and default-exported from the configured file. It receives the
collection, item, source label, author text, and optional snapshot. Return a non-empty route or URL
to render a link; return `undefined` for unsupported collections.

```ts
// app/utils/resolveReferencePath.ts
import type { ResolveReferencePath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const resolveReferencePath: ResolveReferencePath = (collection, item, _label, _text, data) => {
  if (collection !== "articles") return undefined;
  const slug = typeof data?.slug === "string" ? data.slug : item;
  return `/articles/${encodeURIComponent(slug)}`;
};

export default resolveReferencePath;
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-renderer"],
  markdownRenderer: {
    resolveReferencePath: "~/utils/resolveReferencePath",
    componentSets: { article: ["MarkdownButton", "MarkdownCallout", "Reference"] }
  }
});
```

For different presentation, create `app/components/renderer/MarkdownReference.vue` (or the
configured renderer directory). It replaces the built-in while keeping stored `:Reference` syntax.

## Disable runtime registration

```ts
export default defineNuxtConfig({
  markdownRenderer: { enabled: false }
});
```

Prepare-time declarations remain available. Runtime components, auto-imports, templates, and routes
are not registered; declarations alone do not indicate that runtime rendering is enabled.

## Diagnose integration failures

| Symptom                                               | Check                                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Skill is installed but custom MDC does not resolve    | Check module registration, direct-child directory placement, and the registered Nuxt component name.           |
| Component works without a set but fails for one field | Check the exact public name in `componentSets` and the renderer's `component-set`.                             |
| Metadata URL returns HTTP 404                         | Check the configured set name and whether the module is enabled.                                               |
| Directus reports a CORS failure                       | Match the exact browser origin, including scheme and port, in `corsOrigin`; inspect OPTIONS and GET responses. |
| Custom component is missing from editor choices       | Check discovery and statically extractable metadata; inspect build warnings.                                   |
| Nested special input fails validation                 | Put `input` on an inferred string field through `properties` or `items.properties`.                            |
| Macro overrides disappear                             | Check the warning's field path, unsupported keys, top-level `properties`, and required icon collections.       |
| Reference appears as plain text                       | Check resolver path/default export and returned route; include `Reference` in the active set.                  |
| Callout content is missing                            | Use its named `description` slot in MDC.                                                                       |
| SSR hydration warns or Prose styles are missing       | Check that Vue is shared with the application and all three Comark packages use the same version (`>=0.6.2`).  |
| Renderer looks unstyled                               | Load the main CSS and import the module stylesheet after `@nuxt/ui`.                                           |
| Relative video path is unchanged                      | Check absolute `videoBaseUrl`, string `src` on a `video` node, and remount after config changes.               |
| Unrelated component metadata disappears               | Set `scopeComponentMeta: false` when the application needs global extraction.                                  |

Verify fixes with representative stored content, including named sets and existing references. For
editor work, inspect both the full and set-specific metadata endpoints rather than assuming that
successful rendering proves metadata correctness.
