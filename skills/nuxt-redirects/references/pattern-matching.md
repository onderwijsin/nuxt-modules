# Dynamic Pattern Matching Reference

Use this reference whenever a consumer needs redirects that match more than one pathname. Dynamic
matching is intentionally opt-in at both the module and record level.

## Contents

- [Enable pattern matching](#enable-pattern-matching)
- [Redirect record shape](#redirect-record-shape)
- [Pattern syntax](#pattern-syntax)
- [Destination templates](#destination-templates)
- [Matching and precedence](#matching-and-precedence)
- [Query-string behavior](#query-string-behavior)
- [Refreshes and mutations](#refreshes-and-mutations)
- [Unsupported patterns and troubleshooting](#unsupported-patterns-and-troubleshooting)

## Enable pattern matching

Set the module option in the consumer application:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-redirects"],
  redirects: {
    dynamicMatching: true
  }
});
```

Then opt individual records into pattern matching with `match: "pattern"`. Both settings are
required. Existing records remain exact unless they explicitly opt in.

```ts
// server/redirects/legacy.ts
import { defineRedirectSource } from "@onderwijsin/nuxt-redirects/runtime/source";

export default defineRedirectSource(async () => [
  {
    from: "/legacy/:section/:slug",
    to: "/docs/:section/:slug",
    statusCode: 301,
    match: "pattern"
  }
]);
```

The source is discovered from `server/redirects/legacy.ts` during Nitro startup. Refresh the
redirect index using the consuming application's configured refresh task or by calling the public
`refreshRedirects()` workflow. Pattern rules are then compiled in memory for the server process and,
when the Pinia store is enabled, in the browser after its index refresh.

## Redirect record shape

```ts
interface Redirect {
  from: string;
  to: string;
  statusCode?: 301 | 302 | 307 | 308;
  match?: "exact" | "pattern";
}
```

- Omitted `match` means exact matching.
- `match: "exact"` explicitly selects exact matching.
- `match: "pattern"` selects `regexparam` route-pattern matching, but only when `dynamicMatching` is
  enabled.
- A pattern `from` must be a pathname and must not contain a query string.
- `statusCode` defaults to `302`.

## Pattern syntax

Patterns use the supported `regexparam` syntax. Raw `RegExp` values are not valid redirect records.

| Syntax   | Meaning                                             | Example                   |
| -------- | --------------------------------------------------- | ------------------------- |
| `:name`  | Captures exactly one path segment.                  | `/users/:id`              |
| `:name?` | Captures an optional path segment.                  | `/guides/:version?/intro` |
| `*`      | Captures a wildcard path, including `/` separators. | `/files/*`                |
| `*?`     | Captures an optional wildcard path.                 | `/files/*?/download`      |

Named parameters are identified by their name and can be reused in the destination. Wildcards use
the `*` placeholder in the destination.

### Named parameters

```ts
{
  from: "/legacy/:section/:slug",
  to: "/docs/:section/:slug",
  match: "pattern"
}
```

Results:

```text
/legacy/guides/getting-started
→ /docs/guides/getting-started

/legacy/api/reference
→ /docs/api/reference
```

`:name` captures one segment, so `/legacy/guides/a/b` does not match this rule because `:slug`
cannot consume two segments.

### Optional segments

```ts
{
  from: "/guides/:version?/intro",
  to: "/documentation/:version?/intro",
  match: "pattern"
}
```

Results:

```text
/guides/v2/intro
→ /documentation/v2/intro

/guides/intro
→ /documentation/intro
```

Keep the optional marker on the corresponding destination segment when the destination should omit
that segment if it is absent.

### Wildcards

```ts
{
  from: "/files/*",
  to: "/downloads/*",
  statusCode: 302,
  match: "pattern"
}
```

Results:

```text
/files/reports/2026.pdf
→ /downloads/reports/2026.pdf

/files/archive/2025/summary.pdf
→ /downloads/archive/2025/summary.pdf
```

Use `*?` when the wildcard itself may be absent:

```ts
{
  from: "/files/*?/download",
  to: "/downloads/*?/download",
  match: "pattern"
}
```

## Destination templates

The `to` value is a destination template, not a second pattern to match. Captured named parameters
and wildcards are substituted into it when a request matches.

```ts
{
  from: "/legacy/:slug",
  to: "/docs/:slug?source=legacy",
  match: "pattern"
}
```

`/legacy/getting-started` resolves to `/docs/getting-started?source=legacy`.

Captured values are escaped before interpolation. This prevents a path parameter from introducing
control characters, an unsafe scheme, or an unintended host. Destination validation still applies:
destinations must be internal paths, protocol-relative URLs, absolute HTTP(S) URLs, or supported
bare domains.

## Matching and precedence

Pattern rules are the final fallback. For a request such as `/products/basic?campaign=spring`, the
lookup order is:

1. Exact path plus normalized query: `/products/basic?campaign=spring`.
2. Exact path only: `/products/basic`.
3. The first matching dynamic pathname rule.

Exact redirects always win, including a path-only exact redirect over a matching pattern:

```ts
[
  {
    from: "/products/:slug",
    to: "/new-products/:slug",
    match: "pattern"
  },
  { from: "/products/special", to: "/special-products", statusCode: 302 },
  { from: "/products", to: "/product-catalog", statusCode: 302 }
];
```

Results:

```text
/products/special
→ /special-products       (exact wins)

/products/basic
→ /new-products/basic     (pattern matches)

/products/basic?campaign=spring
→ /new-products/basic     (pattern matches pathname)

/products?campaign=spring
→ /product-catalog        (exact path-only fallback wins)
```

When multiple dynamic rules match, the first rule in source discovery order wins. Sources are
discovered lexicographically, and later duplicate dynamic origins are ignored.

## Query-string behavior

Pattern rules match pathname only. They cannot match query keys or values, and the incoming query
string is never appended to the destination implicitly.

```ts
[
  { from: "/legacy?source=old", to: "/archive", statusCode: 301 },
  {
    from: "/legacy/:slug",
    to: "/docs/:slug?source=dynamic",
    statusCode: 302,
    match: "pattern"
  }
];
```

Results:

```text
/legacy?source=old
→ /archive

/legacy/getting-started?source=current
→ /docs/getting-started?source=dynamic

/legacy/getting-started
→ /docs/getting-started?source=dynamic
```

Use an exact query-bearing redirect when a query-specific exception is required.

## Refreshes and mutations

The persisted manifest stores dynamic definitions as data. Executable regular expressions and
destination functions are compiled locally by each server process or browser store and are never
persisted or sent through Nitro storage.

- A complete refresh replaces the exact index and dynamic rule collection.
- Dynamic upserts replace the rule with the same `from` value and invalidate dynamic lookup caches.
- Removing a dynamic origin removes its compiled rule and invalidates dynamic lookup caches.
- Exact lookups remain storage-key lookups and are always evaluated before dynamic rules.
- Dynamic rules are not included in the client payload when `dynamicMatching` is disabled.
- A serving process checks the manifest `updatedAt` at most once per 10 seconds after reaching
  dynamic lookup. It recompiles only when that version differs, limiting cross-process skew without
  adding a manifest read to exact-hit requests.

## Unsupported patterns and troubleshooting

The initial feature deliberately excludes:

- Raw regular expressions.
- Constrained parameter groups such as `/users/:id<[0-9]+>`.
- Query matching inside a pattern origin.
- Arbitrary regular-expression content embedded in a parameter.

If a pattern does not redirect, check these items in order:

1. `redirects.dynamicMatching` is `true` in `nuxt.config.ts`.
2. The record contains `match: "pattern"`.
3. The source was refreshed after the record was added or changed.
4. The `from` value contains only a pathname and uses supported `regexparam` syntax.
5. An exact path or path-plus-query rule is not intentionally taking precedence.
6. The route is not excluded by `excludedNamespaces` or `excludedRoutes`.
