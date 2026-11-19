---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Expose the item list as `MarkdownItemList` in Markdown, component sets, and editor metadata,
following its Vue filename.

**Breaking change for v0.3.0 consumers that use the item list.** Rename stored `::ItemList` blocks to
`::MarkdownItemList`. Replace `"ItemList"` with `"MarkdownItemList"` in `markdownRenderer.componentSets`
and update any editor integrations that use the old metadata name. `RelatedItemList` keeps its
CMS-owned node name.

After migrating, build the application and check that a stored list renders and the editor metadata
endpoint returns `MarkdownItemList` for the relevant component set.
