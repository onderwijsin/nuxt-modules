# @onderwijsin/nuxt-markdown-documents

Source-agnostic Markdown document delivery for Nuxt. Phase 2 provides typed server definitions,
structured resolution, metadata listing and Markdown URL derivation. **Markdown HTTP responses, YAML
serialization and prerendering are not implemented yet.** This is not ready for production document
delivery.

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

| Option      | Default            | Current contract                                                                    |
| ----------- | ------------------ | ----------------------------------------------------------------------------------- |
| `enabled`   | `true`             | Disable server registration/discovery when false. Options are still validated.      |
| `dir`       | `server/documents` | Directory relative to application `rootDir`.                                        |
| `rawPrefix` | `undefined`        | No prefix by default; set `/raw` explicitly for URL derivation and future delivery. |
| `prerender` | `false`            | Validated setting reserved for the later prerendering phase.                        |

An absent implicit default directory is allowed. An explicitly configured missing directory or a
path that is not a directory is an error. Directory paths must be relative, without traversal. The
default is independent of Nuxt's `srcDir` and `serverDir`: if your server directory is custom, set
`dir` explicitly. Only the configured application directory is scanned; layer directories are not
implicitly merged. JavaScript/TypeScript files are discovered recursively in deterministic order,
excluding declaration files. Every discovered file must default-export a document definition; keep
unrelated helpers elsewhere.

`rawPrefix` accepts slash-prefixed literal segments, without trailing slash, query or parameters.
Omit `rawPrefix` (the default), or use `null`, for no prefix; empty strings and `/` are invalid.
Nuxt's standard option merging treats `null` like an omitted value. The URL helper derives these
representations; HTTP delivery follows in a later phase:

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
- `MarkdownDocumentService`: the signatures of the three application-bound utilities.

`list` receives an optional context and must work without an event for future prerendering. Its
paths identify canonical HTML, not Markdown URLs. Consumers own public/published filtering and
credentials. Keep all definitions and source access server-only. Frontmatter must ultimately be
JSON-compatible; validation of that recursive value constraint and YAML serialization arrive in
Phase 3. The top-level transform shape is already validated as exactly frontmatter plus a string
body.

### Route patterns

Use `/`, literal paths, and named single-segment params such as `/articles/:slug`. Names start with
a letter or underscore and contain letters, digits and underscores; each name appears once. Optional
params, wildcards, queries, fragments, encoded segments and traversal are unsupported. Trailing
slashes are rejected. `/index` and paths ending in `.md` are reserved for representation mapping.

Static routes precede parameter routes. Equally specific overlapping patterns are rejected with both
source filenames, including `/articles/:slug` versus `/articles/:id` and `/a/:id` versus `/:id/a`.
Invalid definitions fail when the generated server registry is evaluated. No document callbacks are
executed by registry validation.

## Resolve, list and derive URLs

These functions are Nitro server auto-imports, bound to the discovered definitions in your app. They
do not make internal HTTP requests. The public `/server` package export provides the definition
helper and types; it does not export application-bound utility implementations.

```ts
// server/api/article.get.ts
export default defineEventHandler(async (event) => {
  const document = await resolveMarkdownDocument("/articles/introduction", { event });
  if (document === null) throw createError({ statusCode: 404, message: "Not found" });

  return {
    frontmatter: document.frontmatter,
    body: document.body,
    markdownURL: getMarkdownDocumentURL("/articles/introduction")
  };
});
```

- `resolveMarkdownDocument(path, context?)` returns `Promise<MarkdownDocument | null>`. It matches
  one definition and calls fetch then transform, without calling list. An unmatched path or null
  fetch returns null. It never passes null into transform. Undefined fetches and invalid transforms
  are errors. Body and metadata stay separate; YAML is neither generated nor reparsed.
- `listMarkdownDocuments(context?)` returns `Promise<MarkdownDocumentListItem[]>` by calling only
  list callbacks. Types without list contribute no entries. Listing never fetches or transforms
  bodies. Blank titles, invalid paths and paths owned by another definition are rejected. Identical
  normalized entries deduplicate; conflicting titles/descriptions fail. Only title, path and
  optional description are returned, even if a source includes additional fields.
- `getMarkdownDocumentURL(path)` returns a string with `app.baseURL` and optional rawPrefix applied
  once. It does not check document availability. Supply app-relative canonical HTML paths that
  exclude baseURL, not previously derived `.md` URLs. With baseURL `/docs/`, `/articles/one` maps to
  `/docs/articles/one.md`, or `/docs/raw/articles/one.md` with explicit rawPrefix `/raw`.

All three use the same path policy. Non-root trailing slashes normalize away. Unicode and encoded
paths normalize to percent-encoded output, while fetch receives decoded params. External URLs,
protocol-relative paths, queries/fragments, backslashes, traversal, encoded separators, malformed
escapes and nested encoded escapes are rejected. `/index` and `.md` paths remain reserved. Encoded
ordinary characters such as spaces and Unicode are supported in canonical paths, even though
definition patterns themselves use literal unencoded segments.

The event is optional for resolution and listing; call them without context for event-free server
work. Consumers must ensure such callbacks do not require a request event. Public/published
filtering remains consumer-owned: listing does not retrieve bodies to verify publication state.

Invalid caller paths throw an error with statusCode 400. Callback failures, invalid output and
listing conflicts throw statusCode 500 with operation/source diagnostics that omit backend errors
and payloads. Missing documents return null; they are not converted to HTTP responses by the
service.

## Boundaries and development

No raw endpoint, YAML serializer or prerender behavior is available yet. No sitemap, CMS adapter,
HTML conversion, MCP server or `llms.txt` endpoint is included. Future AI Toolkit integration will
be optional follow-up after the standalone release.

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
