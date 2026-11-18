---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Add `MarkdownRelatedItemList`, persisted as the CMS-owned `RelatedItemList` node. It preserves
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
      linkResolver: "~/utils/resolveRelatedItemPath"
    }
  }
});
```

Each file must default-export its synchronous callback; these are separate files, not one exported
configuration object:

```ts
// app/utils/mapRelatedItem.ts
import type { MapRelatedItem } from "@onderwijsin/nuxt-markdown-renderer/runtime";

const mapRelatedItem: MapRelatedItem = (item) => ({
  description: typeof item.data?.summary === "string" ? item.data.summary : undefined
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
