---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Replace flat resolver options with the `referenceConfig` and `relatedItemListConfig` objects. Both use `linkResolver` for a Nuxt-resolvable file path; related lists also accept a `mapItem` file path. Each callback file default-exports its function.

**Breaking change, intentionally released as a minor:** the published `resolveReferencePath` option has been removed. Existing consumers must migrate before upgrading:

```ts
// Before
markdownRenderer: {
  resolveReferencePath: "~/utils/resolveReferencePath"
}

// After
markdownRenderer: {
  referenceConfig: {
    linkResolver: "~/utils/resolveReferencePath"
  }
}
```

The resolver file and its `ResolveReferencePath` function signature are unchanged. The old option is rejected by configuration validation; it is not a deprecated alias. Persisted `Reference` content does not need migration.

The new related-list integration uses `relatedItemListConfig: { mapItem: "~/utils/mapRelatedItem", linkResolver: "~/utils/resolveRelatedItemPath" }` instead of the draft `relatedItemList` config-module path. Split its callbacks into default-exported functions typed as `MapRelatedItem` and `ResolveRelatedItemPath`. Without `mapItem`, related rows retain their source labels. Without a `linkResolver`, references stay plain text and related rows stay unlinked. Both config objects are optional.
