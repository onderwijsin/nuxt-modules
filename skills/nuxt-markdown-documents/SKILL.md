---
name: nuxt-markdown-documents
description: >
  Integrate @onderwijsin/nuxt-markdown-documents in a Nuxt application: define source-agnostic
  server documents, return JSON-compatible frontmatter and Markdown, expose public metadata
  listings, resolve documents server-side, and configure raw URLs and consumer-owned prerendering.
---

# Markdown Documents

Use this skill when integrating or maintaining an application that uses
`@onderwijsin/nuxt-markdown-documents`. The module owns document resolution, listing validation,
YAML serialization, and scoped raw HTTP delivery. The application owns its data sources, publication
policy, Markdown conversion, HTML pages, and prerender route discovery.

## Register and locate definitions

Install with `pnpm add @onderwijsin/nuxt-markdown-documents` and register the public package:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-markdown-documents"],
  markdownDocuments: { enabled: true }
});
```

Requires Nuxt 4 and Node.js >=24. Node 24 with the repository's pinned Nuxt graph is the tested
baseline. Runtime code is portable to Workers, but consumer clients must be portable too; do not
claim a separate continuously tested Cloudflare deployment matrix.

Options:

- `enabled`: true by default; false skips server registration/discovery after option validation.
- `dir`: `server/documents` relative to application rootDir, independent of srcDir/serverDir. An
  absent implicit default is allowed; an explicitly missing directory is an error. Layer definition
  directories are not merged. Paths must be nonempty, relative, and traversal-free.
- `rawPrefix`: omitted by default, giving `/:path.md`. An explicit prefix such as `/raw` or
  `/content/raw` must contain only letters, digits, underscores, hyphens and segment separators.
  Empty strings, `/`, and trailing slashes are invalid. Null is accepted but treated like omission
  by Nuxt option merging; it does not reliably clear an inherited prefix.
- `contentType`: `"plain"` by default (`text/plain`); `"markdown"` selects `text/markdown`. Both use
  UTF-8 and identical document bytes. Request headers do not override the configured type.

Built-in prerender orchestration is deferred. No module or document `prerender` setting is
supported; configure prerendering in the consuming application. Unsupported definition fields fail
validation.

Every recursively discovered JS/TS file except declarations must default-export a definition. Put
helpers under server/utils or another directory outside dir. Definition imports execute in Nitro;
server aliases and auto-imports are available there. Development additions/removals rebuild the
registry.

## Author the source boundary

Import `defineMarkdownDocument` from `@onderwijsin/nuxt-markdown-documents/server`, or use its Nitro
server auto-import. Never import it into app/client code. It preserves inference without executing
callbacks. Sync and async callbacks are supported.

```ts
// server/documents/guide.ts
import { defineMarkdownDocument } from "@onderwijsin/nuxt-markdown-documents/server";

export default defineMarkdownDocument({
  route: "/guides/:slug",
  fetch: ({ params }) =>
    params.slug === "intro"
      ? { title: "Introduction", summary: "A public guide.", markdown: "# Introduction" }
      : null,
  transform: (guide) => ({
    frontmatter: { title: guide.title, description: guide.summary },
    body: guide.markdown
  }),
  list: () => [{ title: "Introduction", path: "/guides/intro", description: "A public guide." }]
});
```

For real sources, fetch one record directly and apply its public/published filter before returning
it. Null means unavailable and never reaches transform. Undefined is invalid. Keep credentials in
private runtime configuration, and return only public metadata/body fields. Do not expose drafts or
previews through privileged source access.

Transform must return exactly `{ frontmatter: Record<string, unknown>, body: string }`. The fetched
non-null source type is inferred automatically; do not cast it to bypass validation. Convert source
content to Markdown yourself. Fetch context has decoded params and an optional H3 event. Raw HTTP
supplies the event; programmatic callers may omit it. Callbacks used without an event must support
that invocation.

## Preserve paths and listing semantics

Use canonical HTML paths without baseURL or `.md`. Patterns support root, literal segments, and
named single-segment params. Literal characters are Unicode letters/numbers and `._~-`; parameter
names start with a letter/underscore and continue with letters/digits/underscores. Reject optional
params, wildcards, encoded patterns, trailing slashes, queries/fragments, repeated parameter names,
/index and .md endings. Static routes precede parameter routes. Equally specific overlaps between
document definitions fail with source diagnostics. Application route collisions are the consumer's
responsibility: keep raw URLs distinct from pages, server handlers, public files and other modules,
or configure a separate rawPrefix. The module does not inspect application routes or diagnose
collisions; competing owners can shadow each other.

List is optional and independent of resolution. It returns title, canonical path and optional
description, without fetching or transforming every body. Use a metadata query for remote listings.
Apply the same publication policy as fetch: availability is consumer-owned, not checked through body
retrieval. Missing list contributes nothing. Nonblank titles and path ownership are validated;
identical normalized entries deduplicate, conflicting metadata fails, and extra fields are omitted.

Canonical paths normalize non-root trailing slashes, percent-encode Unicode, and decode fetch params
once. Reject external/protocol-relative URLs, backslashes, traversal, encoded separators,
malformed/nested encoding, queries/fragments and raw representations.

Raw mapping:

| Canonical path  | Default            | rawPrefix `/raw`       | `/raw` plus baseURL `/docs/` |
| --------------- | ------------------ | ---------------------- | ---------------------------- |
| `/`             | `/index.md`        | `/raw/index.md`        | `/docs/raw/index.md`         |
| `/guides/intro` | `/guides/intro.md` | `/raw/guides/intro.md` | `/docs/raw/guides/intro.md`  |

Do not create HTML pages automatically or assign a raw URL to another handler.

## Use server utilities directly

These are application-bound Nitro auto-imports, not implementations exported by the package:

```ts
const document = await resolveMarkdownDocument("/guides/intro", { event });
const entries = await listMarkdownDocuments();
const markdownURL = getMarkdownDocumentURL("/guides/intro");
```

- Resolver returns a structured document or null; it calls only the matching fetch and transform,
  never list. Frontmatter/body stay separate; do not serialize and reparse YAML.
- Listing returns structured metadata and calls only list callbacks. Context/event are optional.
- URL derivation applies baseURL and rawPrefix once without checking availability or ownership.
  Inputs exclude baseURL; never pass an already-derived Markdown URL.

Invalid paths throw statusCode 400; failed callbacks or invalid output throw statusCode 500 with
sanitized operation/source diagnostics. Null remains null until an HTTP caller chooses a status.
Consumer MCP tools and discovery adapters can use these functions without self-requests.

The public server subpath exports the helper and types MarkdownDocument, MarkdownDocumentListItem,
MarkdownDocumentDefinition, MarkdownDocumentContext, MarkdownDocumentFetchContext and
MarkdownDocumentService. Do not import internal runtime files or generated registry modules.

## Respect serialization and delivery

Frontmatter values must be JSON-compatible: plain objects including null-prototype objects, dense
arrays, strings, finite numbers, booleans and null. Reject undefined, bigint, symbols/symbol keys,
functions, non-finite numbers, cycles, sparse arrays, accessors, hidden properties and class
instances including Date. Convert dates to strings. Errors identify metadata paths without values.

YAML 1.2 is generated once without aliases/custom tags; repeated non-cyclic references are allowed.
Exactly one blank line separates frontmatter from the body; leading body blank lines normalize at
that boundary. Empty metadata emits the original body unchanged. Do not supply a leading YAML
mapping block in body: raw serialization rejects it. Ordinary horizontal rules are allowed.

Matching GET requests return the selected `text/plain` or `text/markdown` with `charset=utf-8`.
Request Accept and Content-Type headers do not override the configured type. The module does not add
header-based cache variation. Null/private content returns generic 404; unsafe paths return 400
before retrieval; provider/transform/serialization errors return generic 500. Matching HEAD and
other methods return 405 with `Allow: GET` without retrieval. Query strings do not change selection.
HTML, unrelated APIs and neighboring raw routes remain application-owned.

## Leave orchestration to the consumer

Prerender concrete raw URLs through Nuxt/Nitro prerender.routes or existing Directus Prerenderer
mappers. Route rules establish policy but do not enumerate unknown slugs. Make source services and
credentials available during prerender requests. Static hosts control `.md` MIME mappings; configure
the desired `text/plain` or `text/markdown` with UTF-8 and verify deployed headers. The host
controls the response type of prerendered files.

No Directus/CMS adapter, sitemap integration, HTML conversion, HTML/Markdown negotiation on
canonical routes, llms.txt, built-in MCP server or cache/invalidation layer is provided. AI Toolkit
is optional separate integration work; never replace document-owned responses with generic HTML
conversion or competing raw handlers.

Before handing off an application integration, verify a public raw response, a missing/private 404,
structured resolution/listing, URL mapping for the actual baseURL/prefix, and preserved HTML routes.
