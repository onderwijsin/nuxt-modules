---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Replace the flat reference resolver option with `referenceConfig`, and configure related-item
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
