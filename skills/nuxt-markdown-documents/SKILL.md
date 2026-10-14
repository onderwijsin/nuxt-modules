---
name: nuxt-markdown-documents
description:
  Configure typed server-only document definitions with @onderwijsin/nuxt-markdown-documents,
  including nullable rawPrefix and its current development boundaries.
---

# Markdown Documents

Requires Node.js >=24 and Nuxt 4. Phase 1 provides definition authoring, discovery and validation;
HTTP Markdown delivery, resolver/listing services, YAML serialization and prerendering are not
implemented. Do not present the module as ready for production delivery.

When published, install with `pnpm add @onderwijsin/nuxt-markdown-documents`, then register:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: { enabled: true }
});
```

Options: `enabled` defaults to true; `dir` defaults to `server/documents` relative to rootDir;
`rawPrefix` defaults to undefined (no prefix) and accepts an explicit prefix such as `/raw` or null;
`prerender` defaults to false. Prefix/prerender settings are validated but delivery is a later
phase. Empty prefixes and `/` are invalid. Planned default mapping is `/blog/one` → `/blog/one.md`,
root → `/index.md`, with HTML unchanged. Existing `.md` handlers may conflict; future Toolkit
aliases must defer.

False enabled skips registration/discovery after validation. A missing implicit default directory is
allowed; an explicit missing dir is an error. Set dir for a custom serverDir; srcDir/serverDir do
not change the default. Layer definition directories are not merged. Every recursively discovered
JS/TS source (excluding declarations) must default-export a definition. Put helpers elsewhere.

Use only server files:

```ts
import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch: ({ params }) => (params.slug === "intro" ? { title: "Intro" } : null),
  transform: (article) => ({ frontmatter: { title: article.title }, body: "# Intro" }),
  list: () => [{ title: "Intro", path: "/articles/intro" }]
});
```

Nuxt uses standard option merging: null behaves like an omitted value.

The helper is also a Nitro server auto-import, never an app auto-import. It preserves the original
definition without executing callbacks. Fetch-to-transform inference excludes null; sync and async
callbacks are supported. Fetch context has params and an optional H3 event. Listing context is
optional and listing must work without a request event. Consumers own publication filtering and
credentials.

The server subpath also exports types MarkdownDocument, MarkdownDocumentListItem,
MarkdownDocumentDefinition, MarkdownDocumentContext and MarkdownDocumentFetchContext. Transform
returns structured frontmatter plus a string body. Listing paths are canonical HTML. Frontmatter
will require JSON-compatible values; callback result validation and YAML delivery remain planned.

Routes support root, literals and named single-segment params. Reject optional params, wildcards,
queries, fragments, encoded segments, traversal, trailing slashes, repeated param names, /index and
.md endings. Static routes precede parameter routes. Equally specific overlapping patterns fail with
filenames when the server registry is evaluated. Definition additions/removals rebuild Nitro in
development without executing callbacks during discovery.

This module will release standalone before AI Toolkit. No CMS, Agent Discovery or AI Toolkit is
required. Do not invent resolver imports, raw endpoints, negotiation, sitemap integration, discovery
endpoints or MCP tools. Consult the package README for the current phase before integration.
