# @onderwijsin/nuxt-markdown-documents

Serve public Markdown from any server-side data source in Nuxt. Define a canonical route, fetch its
source, and transform it into structured metadata and a Markdown body. The module provides the raw
HTTP response, YAML frontmatter serialization, metadata listing, and server-side document
resolution.

Data access, publication filtering, and conversion of source content to Markdown belong to your
application. No CMS, Directus, AI Toolkit, or Agent Discovery installation is required.

## Installation

```sh
pnpm add @onderwijsin/nuxt-markdown-documents
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"]
});
```

Requires Nuxt 4 and Node.js 24 or newer. Node 24 with the repository's pinned Nuxt dependency graph
is the tested baseline; older Node versions are unsupported. Server runtime code avoids
Node-specific APIs so it can be bundled for Cloudflare Workers. This is a portability contract, not
a separate continuously tested Workers deployment matrix. Your source clients must also support
their target runtime.

## Define a document

Create `server/documents/articles.ts` in your application root. Each discovered file must
default-export a document definition. This complete example uses a local source; replace its lookup
and metadata enumeration with your own CMS, database, API, or application service.

```ts
// server/documents/articles.ts
import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

interface Article {
  title: string;
  summary: string;
  published: boolean;
  publishedAt: string;
  tags: string[];
  markdown: string;
}

const articles = new Map<string, Article>([
  [
    "introduction",
    {
      title: "Introduction",
      summary: "A public introduction to the project.",
      published: true,
      publishedAt: "2026-10-15T09:00:00.000Z",
      tags: ["Getting started"],
      markdown: "# Introduction\n\nThe article body in **Markdown**."
    }
  ],
  [
    "working-notes",
    {
      title: "Working notes",
      summary: "An unpublished draft.",
      published: false,
      publishedAt: "",
      tags: [],
      markdown: "Private draft content."
    }
  ]
]);

export default defineMarkdownDocument({
  route: "/articles/:slug",
  async fetch({ params }) {
    const article = articles.get(params.slug ?? "");
    return article?.published ? article : null;
  },
  transform(article) {
    return {
      frontmatter: {
        title: article.title,
        description: article.summary,
        publishedAt: article.publishedAt,
        tags: article.tags
      },
      body: article.markdown
    };
  },
  list() {
    return [...articles.entries()]
      .filter(([, article]) => article.published)
      .map(([slug, article]) => ({
        title: article.title,
        description: article.summary,
        path: `/articles/${slug}`
      }));
  }
});
```

`GET /articles/introduction.md` returns `Content-Type: text/plain; charset=utf-8`:

```md
---
title: Introduction
description: A public introduction to the project.
publishedAt: 2026-10-15T09:00:00.000Z
tags:
  - Getting started
---

# Introduction

The article body in **Markdown**.
```

`GET /articles/working-notes.md` returns 404. The canonical HTML page `/articles/introduction`
remains application-owned; the module does not create or render that page.

`defineMarkdownDocument` is an identity helper: it preserves type inference and executes no
callbacks. It is also available as a Nitro server auto-import, never as an app auto-import.
Synchronous and asynchronous fetch, transform, and list callbacks are supported. The non-null
fetched type flows into `transform` automatically.

## Configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: {
    enabled: true,
    dir: "server/documents",
    rawPrefix: "/raw",
    contentType: "plain"
  }
});
```

| Option        | Default            | Behavior                                                                                                                 |
| ------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `enabled`     | `true`             | Enables server discovery, utilities, and raw delivery. `false` skips registration; options are still validated.          |
| `dir`         | `server/documents` | Definition directory relative to application `rootDir`.                                                                  |
| `rawPrefix`   | Unset              | Serves canonical paths with `.md` appended. Set a prefix such as `/raw` for prefixed delivery.                           |
| `contentType` | `"plain"`          | Response MIME type: `"plain"` for `text/plain`, or `"markdown"` for `text/markdown`. Request headers do not override it. |

The implicit default directory may be absent. An explicitly configured missing directory, or a path
that is not a directory, fails setup. `dir` must be a nonempty relative path without traversal. It
is independent of Nuxt's `srcDir` and a custom `serverDir`. Layer definition directories are not
merged.

JavaScript and TypeScript files are discovered recursively, excluding declaration files. Keep helper
files outside this directory, for example under `server/utils`. Definitions execute in the compiled
Nitro server, so server aliases and auto-imports can be used there. Adding or removing definition
files in development rebuilds the registry; edits to imported files use Nitro's normal dependency
watcher.

`rawPrefix` accepts a leading-slash path made of letters, digits, underscores, hyphens, and optional
nested segments, such as `/content/raw`. Empty strings, `/`, and trailing slashes are invalid.
`null` is accepted; Nuxt treats it like an omitted value during option merging, so do not use it to
clear a prefix inherited from another configuration layer.

## Definition contract

| Property            | Required | Contract                                                                                     |
| ------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `route`             | Yes      | Canonical application-relative HTML path or pattern, without `app.baseURL` or `.md`.         |
| `fetch(context)`    | Yes      | Returns source data or `null`. Context contains decoded `params` and an optional H3 `event`. |
| `transform(source)` | Yes      | Returns exactly `{ frontmatter: Record<string, unknown>, body: string }`.                    |
| `list(context?)`    | No       | Returns `{ title, path, description? }` entries for public documents.                        |

Definitions accept only the fields listed above; unsupported fields fail validation.

A raw HTTP request supplies the event. Programmatic resolution and listing can run without one, so
callbacks used that way must support event-free execution. A null fetch never reaches transform.
Undefined fetch results and invalid transform results are errors.

For a single document, the module calls only its matching fetch and transform. It never calls list
or retrieves an entire collection. Keep your own lookup similarly focused. For remote sources, make
list request only the metadata it needs instead of downloading and transforming every body.

Listing paths identify canonical HTML, not raw Markdown URLs. Titles must be nonblank. Paths are
normalized and must belong to the definition that lists them. Identical entries for a normalized
path deduplicate; conflicting titles or descriptions fail. Extra listing fields are omitted.
Definitions without list contribute no entries. Listing does not verify availability by fetching
documents: apply the same public/published policy in both callbacks.

### Routes and URL mapping

Patterns support `/`, literal segments, and named single-segment parameters such as
`/articles/:slug`. Parameter names start with a letter or underscore, contain letters, digits or
underscores, and appear only once per pattern. Literal segments allow Unicode letters/numbers and
`._~-`. Optional params, wildcards, encoded patterns, trailing slashes, queries, and fragments are
unsupported. `/index` and paths ending in `.md` are reserved.

Static routes take precedence over parameter routes. Equally specific overlapping patterns fail with
both definition filenames. You are responsible for keeping document-owned raw URLs distinct from
application pages, server handlers, public files and other modules. The module does not inspect
those routes or report collisions; overlapping ownership can cause one response to shadow another.
Give each raw URL one owner, or configure a separate rawPrefix.

| Canonical input | Default URL        | With `rawPrefix: "/raw"` | With `/raw` and `app.baseURL: "/docs/"` |
| --------------- | ------------------ | ------------------------ | --------------------------------------- |
| `/`             | `/index.md`        | `/raw/index.md`          | `/docs/raw/index.md`                    |
| `/articles/one` | `/articles/one.md` | `/raw/articles/one.md`   | `/docs/raw/articles/one.md`             |

Resolution, listing, and URL derivation share a canonical path policy. Non-root trailing slashes
normalize away, Unicode is percent-encoded consistently, and fetch params are decoded once. Reject
external or protocol-relative URLs, backslashes, traversal, encoded separators, malformed or nested
encoding, queries, and fragments. Ordinary encoded parameter characters are supported.

## Server utilities

These application-bound functions are Nitro server auto-imports. They are not exported
implementations from the package's `/server` subpath and must not be imported into client code.

```ts
// server/api/article.get.ts
export default defineEventHandler(async (event) => {
  const path = "/articles/introduction";
  const document = await resolveMarkdownDocument(path, { event });
  if (document === null) throw createError({ statusCode: 404, message: "Not found" });

  return {
    document,
    entries: await listMarkdownDocuments(),
    markdownURL: getMarkdownDocumentURL(path)
  };
});
```

| Utility                                   | Return value                          | Behavior                                                                                                              |
| ----------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `resolveMarkdownDocument(path, context?)` | `Promise<MarkdownDocument \| null>`   | Fetches and transforms one matching document. Null means unmatched or unavailable. Metadata and body remain separate. |
| `listMarkdownDocuments(context?)`         | `Promise<MarkdownDocumentListItem[]>` | Calls list callbacks only; never fetches or transforms bodies.                                                        |
| `getMarkdownDocumentURL(path)`            | `string`                              | Applies `app.baseURL` and rawPrefix once. Does not check availability or route ownership.                             |

Pass canonical paths excluding `app.baseURL`, not previously derived raw URLs. Utilities use the
same service as HTTP delivery, without internal HTTP requests or YAML reparsing. Invalid caller
paths throw statusCode 400. Callback failures and invalid output throw statusCode 500 with sanitized
operation/source diagnostics; backend errors and source payloads are not included.

The public `@onderwijsin/nuxt-markdown-documents/server` subpath exports `defineMarkdownDocument`
and these types: `MarkdownDocument`, `MarkdownDocumentListItem`,
`MarkdownDocumentDefinition<TSource>`, `MarkdownDocumentContext`, `MarkdownDocumentFetchContext`,
and `MarkdownDocumentService`. The package root also exports the `ModuleOptions` type for module
configuration.

## Frontmatter and HTTP delivery

Frontmatter accepts plain objects (including null-prototype objects), dense arrays, strings, finite
numbers, booleans, and null, recursively. Dates must be strings. Undefined, non-finite numbers,
bigint, functions, symbols or symbol keys, cycles, sparse arrays, accessors, hidden properties, and
class instances are rejected. Validation reports the metadata path without its value.

YAML 1.2 serialization preserves scalar types and emits no custom tags or aliases. Repeated
non-cyclic references serialize independently. The module writes one frontmatter block and exactly
one blank line before the body, normalizing leading body blank lines at that boundary. Other body
content is unchanged. Empty metadata emits the original body without delimiters or whitespace
changes. Do not put a leading YAML mapping block in body; raw delivery rejects it. Ordinary Markdown
horizontal rules are supported.

Responses use `text/plain; charset=utf-8` by default. Set `markdownDocuments.contentType` to
`"markdown"` to default to `text/markdown; charset=utf-8` instead. Both formats contain identical
Markdown and YAML bytes.

Request `Accept` and `Content-Type` headers do not change the response type. The module does not add
header-based cache variation.

Only GET retrieves a document. Matching HEAD and other methods return 405 with `Allow: GET`, without
calling fetch or transform. A query string does not change HTTP document selection. Missing/private
documents return generic 404 responses; unsafe matched paths return 400 before retrieval. Provider,
transform, and serialization failures return a generic 500. Other HTML, API, and unrelated `.md`
routes pass through to the application.

## Public data and credentials

Raw routes are public. Filter drafts, previews, and private records in both fetch and list. A
privileged CMS token must not turn those records into public exports. Include only deliberately
public fields in frontmatter and body; never return credentials or internal source objects
wholesale.

Keep source clients, credentials, fetchers, and transforms in server files. Use your application's
private runtime configuration and source validation. A consumer-owned MCP tool or discovery adapter
can call the server utilities directly; it does not need to fetch the application's HTTP endpoints.

## Prerendering and integrations

The module does not discover routes or schedule prerendering. There is no module or per-document
`prerender` option; built-in prerender orchestration is deferred. Configure concrete raw URLs
through Nuxt/Nitro or an existing route-discovery module. For the default URL mapping:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  nitro: {
    prerender: {
      routes: ["/articles/introduction.md"],
      failOnError: true
    }
  }
});
```

Use `/raw/articles/introduction.md` when rawPrefix is `/raw`. Route rules express rendering policy;
wildcard rules do not enumerate unknown slugs. Existing Directus Prerenderer mappers may return raw
Markdown URLs alongside HTML routes. Source services and private credentials must be available
during prerender requests. Your host controls MIME mappings for generated files: serve `.md` with
the desired `text/plain` or `text/markdown` MIME type and UTF-8 charset, and verify that response in
the deployed environment.

The module has no HTML conversion, HTML/Markdown negotiation on canonical routes, sitemap
integration, `llms.txt`, built-in MCP server, source adapter framework, or cache/invalidation layer.
AI Toolkit integration is separate optional work; do not register competing handlers for
document-owned raw URLs or convert their Markdown through an HTML converter.

## Troubleshooting

| Symptom                      | Check                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Definition is not discovered | Check root-relative dir, nested source extensions, and the file's default export. Keep helpers elsewhere.                           |
| Raw request returns 404      | Use the derived raw URL and inspect the matching fetch result and publication filter.                                               |
| Raw request returns 500      | Call the structured resolver server-side for sanitized fetch/transform diagnostics; check JSON metadata and body-owned frontmatter. |
| Listing fails                | Check nonblank titles, canonical paths, definition ownership, and conflicting duplicate metadata.                                   |
| Server fails at startup      | Resolve ambiguous document-definition patterns identified in the error.                                                             |
