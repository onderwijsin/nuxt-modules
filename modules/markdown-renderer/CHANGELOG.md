# Changelog

## 0.3.0

### Minor Changes

- 83619c9: Add the `MarkdownAnchor` block component for invisible fragment targets, with editor metadata and a
  configurable CSS scroll offset. Existing Markdown needs no content migration for this addition.

  **Upgrade and peer dependencies**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the renderer in the application:

  ```sh
  pnpm add @onderwijsin/nuxt-markdown-renderer@0.3.0
  ```

  Keep application-owned Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and
  `comark` `>=0.6.2`. Keep the three Comark packages on the same version. This feature adds no new
  peers. If these dependencies are missing or incompatible, this is a compatible installation example;
  retain existing compatible versions rather than replacing them unnecessarily:

  ```sh
  pnpm add 'vue@^3.5.0' '@nuxt/ui@^4.0.0' \
    @comark/nuxt@0.7.0 @comark/vue@0.7.0 comark@0.7.0
  ```

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.

  Keep `@onderwijsin/nuxt-markdown-renderer` registered in `nuxt.config.ts`. Import its stylesheet
  after Tailwind and Nuxt UI in the application's main CSS file:

  ```css
  @import "tailwindcss";
  @import "@nuxt/ui";
  @import "@onderwijsin/nuxt-markdown-renderer";
  ```

  If the application still sets `markdownRenderer.resolveReferencePath`, move that existing path to
  `markdownRenderer.referenceConfig.linkResolver` before starting the upgraded application. The old
  key is rejected. Keep the existing callback file, default export, and persisted `Reference` content.

  **Enable anchors in content**

  If a field uses a named component set, add `MarkdownAnchor` to that set while retaining its existing
  entries. Without a component set, the built-in component is already available:

  ```ts
  export default defineNuxtConfig({
    markdownRenderer: {
      componentSets: {
        article: ["MarkdownButton", "MarkdownCallout", "MarkdownAnchor"],
      },
    },
  });
  ```

  Persist the node as `MarkdownAnchor`, with a required, unique string `id` and no slot content:

  ```mdc
  [Jump to this section](#next-steps)

  ::MarkdownAnchor{id="next-steps"}
  ::
  ```

  The target renders as an empty `span`. The module stylesheet gives it a default
  `scroll-margin-top: 100px`; override `.markdown-anchor { scroll-margin-top: 64px; }` after the
  module CSS if a different fixed-header offset is needed.

  **Verify the upgrade**

  Run `pnpm exec nuxt prepare`, your application's typecheck, and `pnpm exec nuxt build`. Check the
  field's `/api/markdown-renderer/components/article` metadata endpoint for `MarkdownAnchor`, then
  follow a fragment link on a rendered page and confirm its position below the header.

- 83619c9: Add `MarkdownItemList`, persisted in Markdown as `ItemList`, for ordered display rows with optional
  dividers, images or icons, and links. Existing content needs no migration unless you choose to adopt
  the new node.

  **Upgrade and peer dependencies**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the renderer in the application:

  ```sh
  pnpm add @onderwijsin/nuxt-markdown-renderer@0.3.0
  ```

  Keep application-owned Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and
  `comark` `>=0.6.2`. Keep the three Comark packages on the same version. This feature adds no new
  peers. If these dependencies are missing or incompatible, this is a compatible installation example;
  retain existing compatible versions rather than replacing them unnecessarily:

  ```sh
  pnpm add 'vue@^3.5.0' '@nuxt/ui@^4.0.0' \
    @comark/nuxt@0.7.0 @comark/vue@0.7.0 comark@0.7.0
  ```

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.

  Keep `@onderwijsin/nuxt-markdown-renderer` registered in `nuxt.config.ts`. Import its stylesheet
  after Tailwind and Nuxt UI in the application's main CSS file:

  ```css
  @import "tailwindcss";
  @import "@nuxt/ui";
  @import "@onderwijsin/nuxt-markdown-renderer";
  ```

  If the application still sets `markdownRenderer.resolveReferencePath`, move that existing path to
  `markdownRenderer.referenceConfig.linkResolver` before starting the upgraded application. The old
  key is rejected. Keep the existing callback file, default export, and persisted `Reference` content.

  **Enable and write item lists**

  Add `ItemList` to each named component set used by the field, retaining existing entries. Use
  `ItemList`, not the Vue implementation name `MarkdownItemList`, in both the allowlist and stored
  Markdown. No allowlist entry is needed when `component-set` is omitted.

  ```mdc
  ::ItemList
  ---
  divide: true
  items:
    - title: Our services
      description: Explore how we can help.
      image: /images/services.jpg
      to: /services
    - title: Nuxt UI
      icon: i-lucide-external-link
      to: https://ui.nuxt.com
      external: true
  ---
  ::
  ```

  `items` is required; all fields on an item are optional. `divide` defaults to `false`. An image
  takes precedence over an icon. Omit `to` for an unlinked row; `external` only has an effect when
  `to` is present and opens the destination in a new tab. The node has no content slots.

  Refresh the Directus editor's configured renderer metadata URL after deploying. Nested image, URL,
  and Lucide icon controls are supplied by the renderer metadata; no separate application plugin or
  new editor node implementation is required for `ItemList`.

  **Verify the upgrade**

  Run `pnpm exec nuxt prepare`, your application's typecheck, and `pnpm exec nuxt build`. Confirm the
  field's metadata includes `ItemList`, then check a rendered list with an internal link, an external
  link, an image, and dividers.

- 83619c9: Add `MarkdownRelatedItemList`, persisted as the CMS-owned `RelatedItemList` node. It preserves
  selection order and reuses item-list rendering, while the application owns display mapping and route
  resolution.

  **Upgrade and peer dependencies**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the renderer in the application:

  ```sh
  pnpm add @onderwijsin/nuxt-markdown-renderer@0.3.0
  ```

  Keep application-owned Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and
  `comark` `>=0.6.2`. Keep the three Comark packages on the same version. This feature adds no new
  peers. If these dependencies are missing or incompatible, this is a compatible installation example;
  retain existing compatible versions rather than replacing them unnecessarily:

  ```sh
  pnpm add 'vue@^3.5.0' '@nuxt/ui@^4.0.0' \
    @comark/nuxt@0.7.0 @comark/vue@0.7.0 comark@0.7.0
  ```

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.

  Keep `@onderwijsin/nuxt-markdown-renderer` registered in `nuxt.config.ts`. Import its stylesheet
  after Tailwind and Nuxt UI in the application's main CSS file:

  ```css
  @import "tailwindcss";
  @import "@nuxt/ui";
  @import "@onderwijsin/nuxt-markdown-renderer";
  ```

  If the application still sets `markdownRenderer.resolveReferencePath`, move that existing path to
  `markdownRenderer.referenceConfig.linkResolver` before starting the upgraded application. The old
  key is rejected. Keep the existing callback file, default export, and persisted `Reference` content.

  **Connect CMS selections to the application**

  The CMS/editor must supply the `RelatedItemList` node and its selection UI. It is deliberately
  excluded from `/api/markdown-renderer/components` metadata, like `Reference`; do not expect it in
  the generic component menu or implement a second generic metadata entry. It resolves independently
  of component sets and needs no allowlist entry.

  Each selection requires `collection: string` and `item: string | number`; `label` and the `data`
  snapshot are optional. Preserve the stored node name and selection order:

  ```mdc
  ::RelatedItemList
  ---
  items:
    - collection: articles
      item: article-7
      label: Becoming a teacher
      data:
        slug: becoming-a-teacher
        summary: Explore the routes into teaching.
  ---
  ::
  ```

  The renderer does not fetch source records or infer collection-specific URLs. Ensure the CMS
  supplies the snapshot fields your callbacks need, and validate incoming content at your
  application's CMS/content ingestion boundary.

  Configure optional, Nuxt-resolvable callback file paths:

  ```ts
  export default defineNuxtConfig({
    markdownRenderer: {
      relatedItemListConfig: {
        mapItem: "~/utils/mapRelatedItem",
        linkResolver: "~/utils/resolveRelatedItemPath",
      },
    },
  });
  ```

  Each file must default-export its synchronous callback; these are separate files, not one exported
  configuration object:

  ```ts
  // app/utils/mapRelatedItem.ts
  import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

  const mapRelatedItem: MapRelatedItem = (item) => ({
    description:
      typeof item.data?.summary === "string" ? item.data.summary : undefined,
  });
  export default mapRelatedItem;
  ```

  ```ts
  // app/utils/resolveRelatedItemPath.ts
  import type { ResolveRelatedItemPath } from "@onderwijsin/nuxt-markdown-renderer/runtime";

  const resolveRelatedItemPath: ResolveRelatedItemPath = (item) => {
    const slug = item.data?.slug;
    if (item.collection === "articles" && typeof slug === "string")
      return `/articles/${encodeURIComponent(slug)}`;
  };
  export default resolveRelatedItemPath;
  ```

  Without `mapItem`, titles use source labels. Mapping can supply `ItemListItem` display fields except
  `to`; resolve destinations only through `linkResolver`. Returning `undefined`, or omitting the
  resolver, leaves a row unlinked. Callbacks run in SSR and client rendering, so keep credentials and
  server-only services out of them. The node accepts only `items`, with no slots or `divide` prop.

  **Verify the upgrade**

  Run `pnpm exec nuxt prepare`, your application's typecheck, and `pnpm exec nuxt build`. Render
  selections from each supported collection, including a numeric ID and an item without a resolved
  URL. Confirm order, labels, mapped descriptions/images, and link destinations. If using the earlier
  draft `relatedItemList` config-module path, migrate to the two callback paths above; stored
  `RelatedItemList` content does not need renaming.

- 83619c9: Replace the flat reference resolver option with `referenceConfig`, and configure related-item
  callbacks through `relatedItemListConfig`.

  **Breaking change, intentionally released as a minor:** the published `resolveReferencePath` option
  is removed. Configuration validation rejects the old key; it is not a deprecated alias. Migrate
  before running the upgraded application.

  **Upgrade and peer dependencies**

  Use Node.js 24 or newer and Nuxt 4. Upgrade the renderer in the application:

  ```sh
  pnpm add @onderwijsin/nuxt-markdown-renderer@0.3.0
  ```

  Keep application-owned Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and
  `comark` `>=0.6.2`. Keep the three Comark packages on the same version. This feature adds no new
  peers. If these dependencies are missing or incompatible, this is a compatible installation example;
  retain existing compatible versions rather than replacing them unnecessarily:

  ```sh
  pnpm add 'vue@^3.5.0' '@nuxt/ui@^4.0.0' \
    @comark/nuxt@0.7.0 @comark/vue@0.7.0 comark@0.7.0
  ```

  Resolve unmet peer requirements and commit the updated application manifest and lockfile together.

  Keep `@onderwijsin/nuxt-markdown-renderer` registered in `nuxt.config.ts`. Import its stylesheet
  after Tailwind and Nuxt UI in the application's main CSS file:

  ```css
  @import "tailwindcss";
  @import "@nuxt/ui";
  @import "@onderwijsin/nuxt-markdown-renderer";
  ```

  If the application still sets `markdownRenderer.resolveReferencePath`, move that existing path to
  `markdownRenderer.referenceConfig.linkResolver` before starting the upgraded application. The old
  key is rejected. Keep the existing callback file, default export, and persisted `Reference` content.

  **Migrate reference configuration**

  Move the existing resolver path under `referenceConfig.linkResolver` in `nuxt.config.ts`:

  ```ts
  // Before
  markdownRenderer: {
    resolveReferencePath: "~/utils/resolveReferencePath";
  }

  // After
  markdownRenderer: {
    referenceConfig: {
      linkResolver: "~/utils/resolveReferencePath";
    }
  }
  ```

  Keep the resolver file and its default export. Its public `ResolveReferencePath` signature remains
  `(collection, item, label?, text?, data?) => string | undefined`, imported as a type from
  `@onderwijsin/nuxt-markdown-renderer/runtime`. No stored `Reference` content migration is required.
  Returning `undefined` leaves the reference plain text.

  **Migrate draft related-list integrations**

  If you used the earlier draft `relatedItemList` config-module path, remove that key and split its
  callbacks into two default-exported synchronous functions:

  ```ts
  markdownRenderer: {
    relatedItemListConfig: {
      mapItem: "~/utils/mapRelatedItem",
      linkResolver: "~/utils/resolveRelatedItemPath"
    }
  }
  ```

  Type `mapRelatedItem` as `MapRelatedItem` and the resolver as `ResolveRelatedItemPath`, both from
  `@onderwijsin/nuxt-markdown-renderer/runtime`. Each receives one complete CMS selection
  (`collection`, string/numeric `item`, optional `label`, optional `data`). Mapping returns display
  fields except `to`; the resolver returns the destination or `undefined`. A named export or a
  default-exported configuration object is not a substitute for a default-exported callback function.

  Both config objects and each callback are optional. Applications without a reference resolver need
  no new reference config. Without related-item mapping, source labels remain; without a resolver,
  rows stay unlinked. Stored `RelatedItemList` nodes do not need migration. Callback code is bundled
  for both SSR and the client; keep it free of secrets and server-only dependencies.

  **Verify the upgrade**

  Search your application and shared Nuxt layers for `resolveReferencePath:` and the old
  `relatedItemList:` configuration key, and migrate every occurrence. Run `pnpm exec nuxt prepare`,
  your application's typecheck, and `pnpm exec nuxt build`. Check one linked and one unresolved
  reference, plus related-list display mapping and destinations where configured.

### Patch Changes

- Updated dependencies [e708b2d]
  - @onderwijsin/nuxt-module-utils@0.5.2

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
