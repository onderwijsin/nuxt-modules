# @onderwijsin/nuxt-markdown-documents

Source-agnostic Markdown document delivery for Nuxt. Phase 1 provides typed server definitions,
discovery and validation. **Document resolution, listing services, Markdown HTTP responses and
prerendering are not implemented yet.** This is not ready for production document delivery.

The module will be released standalone before AI Toolkit. No CMS, AI Toolkit or Agent Discovery
installation is required.

## Registration

Once the package is available from the registry:

```sh
pnpm add @onderwijsin/nuxt-markdown-documents
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: {
    enabled: true
  }
});
```

Requires Node.js >=24 and Nuxt 4. The pinned workspace graph on Node 24 is the tested baseline.
Runtime code uses no Node-specific filesystem APIs; discovery runs at build time.

| Option      | Default            | Current contract                                                                       |
| ----------- | ------------------ | -------------------------------------------------------------------------------------- |
| `enabled`   | `true`             | Disable server registration/discovery when false. Options are still validated.         |
| `dir`       | `server/documents` | Directory relative to application `rootDir`.                                           |
| `rawPrefix` | `undefined`        | No prefix by default; set `/raw` explicitly to opt into a prefix. Delivery is planned. |
| `prerender` | `false`            | Validated setting reserved for the later prerendering phase.                           |

An absent implicit default directory is allowed. An explicitly configured missing directory or a
path that is not a directory is an error. Directory paths must be relative, without traversal. The
default is independent of Nuxt's `srcDir` and `serverDir`: if your server directory is custom, set
`dir` explicitly. Only the configured application directory is scanned; layer directories are not
implicitly merged. JavaScript/TypeScript files are discovered recursively in deterministic order,
excluding declaration files. Every discovered file must default-export a document definition; keep
unrelated helpers elsewhere.

`rawPrefix` accepts slash-prefixed literal segments, without trailing slash, query or parameters.
Omit `rawPrefix` (the default), or use `null`, for no prefix; empty strings and `/` are invalid.
Nuxt's standard option merging treats `null` like an omitted value. Once delivery is implemented:

| Canonical HTML | With `/raw`        | Without a prefix |
| -------------- | ------------------ | ---------------- |
| `/blog/one`    | `/raw/blog/one.md` | `/blog/one.md`   |
| `/`            | `/raw/index.md`    | `/index.md`      |

These `.md` URLs are separate from the canonical HTML route. Existing `.md` routes can conflict; do
not assign the same URL to two handlers. Future AI Toolkit integration must respect document
ownership in either mode. There is no content negotiation in this module.

## Define documents on the server

```ts
// server/documents/articles.ts
import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/articles/:slug",
  fetch({ params, event }) {
    // Replace this local source with any consumer-owned public data lookup.
    // event is optional because later build-time resolution has no HTTP event.
    return params.slug === "introduction"
      ? { title: "Introduction", content: "# Introduction" }
      : null;
  },
  transform(article) {
    return {
      frontmatter: { title: article.title },
      body: article.content
    };
  },
  list() {
    return [{ title: "Introduction", path: "/articles/introduction" }];
  }
});
```

`defineMarkdownDocument` is also a Nitro server auto-import. It is not an app auto-import. Both sync
and async callbacks are supported; the fetched non-null source type flows into `transform`. The
helper returns the original definition without calling callbacks. Definition imports and route
validation run in the Nitro registry at server startup, not by evaluating consumer modules in Nuxt
configuration. Adding/removing definitions in development triggers a Nitro rebuild automatically.

The public `/server` subpath exports the helper and these types:

- `MarkdownDocument`: exactly `{ frontmatter: Record<string, unknown>, body: string }`.
- `MarkdownDocumentListItem`: `{ title: string, path: string, description?: string }`.
- `MarkdownDocumentDefinition<TSource>`: route, fetch, transform, optional list and prerender.
- `MarkdownDocumentContext`: an optional H3 event.
- `MarkdownDocumentFetchContext`: route params plus that optional event.

`list` receives an optional context and must work without an event for future prerendering. Its
paths identify canonical HTML, not Markdown URLs. Consumers own public/published filtering and
credentials. Keep all definitions and source access server-only. Frontmatter must ultimately be
JSON-compatible; YAML serialization and validation of callback results arrive in later phases.

### Route patterns

Use `/`, literal paths, and named single-segment params such as `/articles/:slug`. Names start with
a letter or underscore and contain letters, digits and underscores; each name appears once. Optional
params, wildcards, queries, fragments, encoded segments and traversal are unsupported. Trailing
slashes are rejected. `/index` and paths ending in `.md` are reserved for representation mapping.

Static routes precede parameter routes. Equally specific overlapping patterns are rejected with both
source filenames, including `/articles/:slug` versus `/articles/:id` and `/a/:id` versus `/:id/a`.
Invalid definitions fail when the generated server registry is evaluated. No document callbacks are
executed by registry validation.

## Boundaries and development

No raw endpoint, resolver/listing service, URL utility, YAML serializer or prerender behavior is
available yet. No sitemap, CMS adapter, HTML conversion, MCP server or `llms.txt` endpoint is
included. Future AI Toolkit integration will be optional follow-up after the standalone release.

See
[the implementation plan](https://github.com/onderwijsin/nuxt-modules/blob/main/modules/markdown-documents/IMPLEMENTATION.md)
for the remaining phases, based on [#354](https://github.com/onderwijsin/nuxt-modules/issues/354)
and related [#353](https://github.com/onderwijsin/nuxt-modules/issues/353).

The playground registers the public package and extends the shared playground layer. After preparing
the workspace:

```sh
pnpm --filter @onderwijsin/nuxt-markdown-documents dev
pnpm exec vitest run modules/markdown-documents/__tests__
pnpm --filter @onderwijsin/nuxt-markdown-documents build
pnpm --filter markdown-documents-playground typecheck
pnpm --filter markdown-documents-playground build
```
