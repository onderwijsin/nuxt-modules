---
"@onderwijsin/nuxt-markdown-documents": minor
---

Deduplicate the sitemap entries AI Ready adds to runtime `/llms.txt` when curated Markdown listings
already cover the same URLs. Opt in with AI Ready 3.6.1 or a later 3.6 patch.

```ts
export default defineNuxtConfig({
  markdownDocuments: {
    dedupeAiReadyLlmsSitemapEntries: {
      title: "Overige pagina's",
      description: "Andere openbare pagina's op deze website."
    }
  }
});
```

The adapter replaces AI Ready's automatic `Pages` list and respects `aiReady.llmsTxt.sitemaps`.
Remove any `aiReady.llmsTxt.pages: false` setting you added for deduplication. Leave the option
unset to keep the existing discovery behavior. For runtime updates, serve `/llms.txt` from Nitro.
After building the app, confirm that a curated document appears with its Markdown link and a page
outside the curated sections appears once under the configured heading.
