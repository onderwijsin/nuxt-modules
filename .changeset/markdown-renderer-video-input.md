---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Support `input: "video"` and `input: { type: "video" }` in `defineEditorComponentSchema` for
inferred string props. Video uses the same option-free schema as image and emits a
`specialInputType` tag with the value `video`.

Existing component schemas need no migration. To use the new input, add it to a string prop,
typecheck and build the application, then check the prop's tag at `/api/markdown-renderer/components`.
