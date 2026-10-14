---
name: nuxt-markdown-documents
description:
  Configure typed server-only document definitions with @onderwijsin/nuxt-markdown-documents,
  including structured resolution, JSON frontmatter and scoped raw Markdown delivery.
---

# Markdown Documents

Requires Node.js >=24 and Nuxt 4. Phase 3 provides typed definitions, structured resolution,
metadata listing, URL derivation and dynamic Markdown delivery with YAML 1.2 frontmatter.
Prerendering remains unimplemented.

When published, install with `pnpm add @onderwijsin/nuxt-markdown-documents`, then register:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: { enabled: true }
});
```

Options: `enabled` defaults to true; `dir` defaults to `server/documents` relative to rootDir;
`rawPrefix` defaults to undefined (no prefix) and accepts an explicit prefix such as `/raw` or null;
`prerender` defaults to false. Delivery and the URL helper use rawPrefix; prerender is validated but
its behavior is a later phase. Empty prefixes and `/` are invalid. Default URL mapping is
`/blog/one` → `/blog/one.md`, root → `/index.md`, with HTML unchanged. Existing `.md` handlers may
conflict; future Toolkit aliases must defer.

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
MarkdownDocumentDefinition, MarkdownDocumentContext, MarkdownDocumentFetchContext and
MarkdownDocumentService. Transform returns structured frontmatter plus a string body. Listing paths
are canonical HTML. Frontmatter requires JSON-compatible values recursively; the exact transform
shape is validated.

Definition patterns support root, literals and named single-segment params. Reject optional params,
wildcards, queries, fragments, encoded segments, traversal, trailing slashes, repeated param names,
/index and .md endings. Static routes precede parameter routes. Equally specific overlapping
patterns fail with filenames when the server registry is evaluated. Definition additions/removals
rebuild Nitro in development without executing callbacks during discovery.

Use these application-bound Nitro server auto-imports, not imports from the package server subpath:

- `resolveMarkdownDocument(path, context?)` returns a Promise of structured document or null. It
  fetches and transforms one match, never lists. Null fetch/unmatched path means unavailable;
  transform-null/undefined or undefined fetch means invalid output. Metadata/body stay separate.
- `listMarkdownDocuments(context?)` returns a Promise of structured listing entries, without fetch
  or transform. Types without list contribute nothing. Titles must be nonblank, paths canonical and
  owned by the listing definition. Identical entries deduplicate; conflicting metadata fails. Extra
  source fields are omitted from returned metadata. Consumers own publication filtering.
- `getMarkdownDocumentURL(path)` derives a URL without fetching or checking availability. It applies
  app.baseURL and optional rawPrefix once. Canonical inputs exclude baseURL and never end in .md.

Example in a server handler:

```ts
const document = await resolveMarkdownDocument("/articles/intro", { event });
const entries = await listMarkdownDocuments();
const markdownURL = getMarkdownDocumentURL("/articles/intro");
```

Context and its event are optional; callbacks must support event-free invocation for build/server
work. Canonical path normalization removes trailing slashes, percent-encodes Unicode consistently,
and decodes fetch params once. Reject external/protocol-relative URLs, traversal, backslashes,
queries/fragments, encoded separators, malformed/nested encoding, /index and .md representations.
Definition patterns remain unencoded; ordinary encoded parameter characters are supported.

Caller path errors have statusCode 400. Callback/shape/listing errors have statusCode 500 with
sanitized operation/source diagnostics. Missing documents return null; callers choose HTTP status.
Structured utilities make no self-requests and neither serialize nor reparse YAML.

GET derived `.md` URLs returns `text/plain; charset=utf-8`. Only declared patterns are served; HTML
and unrelated `.md` handlers remain unchanged. Explicit overlapping `.md` pages/handlers fail at
startup with source diagnostics. Missing/private content returns generic 404; unsafe params return
400 before fetch; provider/transform/serialization errors return generic 500. HEAD and other methods
return 405 with `Allow: GET`, without fetching. Query strings do not change document selection.

Frontmatter permits plain objects (including null-prototype objects), dense arrays, strings,
booleans, finite numbers and null. Reject undefined, bigint, functions, symbols/symbol keys,
non-finite numbers, cycles, sparse arrays, getters, hidden properties and class instances such as
Date. Convert dates to strings. Structured validation reports metadata paths without values. Shared
non-cyclic references are allowed; YAML emits no aliases/custom tags. Body is Markdown without a
leading YAML mapping block; duplicate body metadata is an error. Empty metadata emits the body
unchanged. Ordinary horizontal rules remain valid. Only HTTP delivery writes frontmatter delimiters.

This module will release standalone before AI Toolkit. No CMS, Agent Discovery or AI Toolkit is
required. Do not invent package imports for application-bound utilities, negotiation, sitemap
integration, discovery endpoints or MCP tools. Consult the package README for the current phase
before integration.
