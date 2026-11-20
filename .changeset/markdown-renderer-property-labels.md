---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Set an editor display label on any inferred property with
`properties: { video: { label: "My Video", input: "video" } }` in `defineEditorComponentSchema`.
Labels also work on nested property overrides. The metadata endpoint returns the optional `label`
alongside the Vue prop name and the rest of its metadata.

Existing schemas need no migration. To verify a new label, typecheck and build the application,
then inspect the property in `/api/markdown-renderer/components`.
