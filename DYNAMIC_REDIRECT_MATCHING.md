# Add opt-in dynamic redirect rules alongside exact redirects

## Summary

Extend `@onderwijsin/nuxt-redirects` with a small, opt-in set of pattern-based redirect rules while
preserving the existing exact-origin lookup path.

Dynamic matching requires two levels of opt-in:

1. The consumer application enables dynamic matching through module options.
2. Individual redirect records opt into pattern matching with `match: "pattern"`.

Dynamic matching is disabled by default. Existing redirects remain exact by default, preserving
current behavior for existing consumers.

```ts
export default defineNuxtConfig({
  redirects: {
    dynamicMatching: true
  }
});
```

```ts
{
  from: "/legacy/:section/:slug",
  to: "/docs/:section/:slug",
  statusCode: 301,
  match: "pattern"
}
```

## Proposed redirect shape

Extend the public redirect type with an optional match mode:

```ts
interface Redirect {
  from: string;
  to: string;
  statusCode?: 301 | 302 | 307 | 308;
  match?: "exact" | "pattern";
}
```

Rules without `match` remain exact:

```ts
{
  from: "/files/*",
  to: "/downloads",
  statusCode: 302
}
```

An explicit exact marker may be used for clarity:

```ts
{
  from: "/files/*",
  to: "/downloads",
  statusCode: 302,
  match: "exact"
}
```

A rule with `match: "pattern"` is dynamic only when the module-level option is enabled.

## Module option

Add the following option to the module schema and runtime configuration:

```ts
dynamicMatching: z.boolean().default(false);
```

The option must be available to both server and client runtime code.

When `dynamicMatching` is `false`:

- Exact redirects continue to be normalized, indexed, cached, and matched normally.
- Pattern rules are not compiled.
- Pattern rules are not consulted during request handling.
- Pattern rules must not silently become exact rules.
- Pattern rules should be skipped with a clear diagnostic during refresh, or rejected consistently
  by the refresh validation path.
- No dynamic rules are sent to the client.

When `dynamicMatching` is `true`:

- Exact rules continue using the existing exact index.
- Only records with `match: "pattern"` are compiled as dynamic rules.
- Dynamic rules are evaluated only after exact lookups fail.

## Exact and dynamic storage model

Keep exact redirects in the existing normalized index. Rename the manifest field from `redirects` to
`exact` so the two matching mechanisms are explicit:

```ts
interface RedirectManifest {
  exact: RedirectIndex;
  dynamic: DynamicRedirectRule[];
  updatedAt: string;
}
```

`exact` contains the same normalized path/query keys and `ResolvedRedirect` values that are
currently stored under `redirects`. The existing exact index lookup remains unchanged in complexity
and behavior.

`dynamic` contains serializable rule definitions, not executable functions:

```ts
interface DynamicRedirectRule {
  from: string;
  to: string;
  statusCode: 301 | 302 | 307 | 308;
  match: "pattern";
}
```

The persisted manifest must contain only data that can safely be serialized through Nitro storage.

## What “process-local compiled matchers” means

An executable regular expression, matcher function, or destination interpolation function is a
JavaScript runtime object. It should not be written to Nitro storage, returned through the HTTP API,
persisted in the client store, or shared between processes. Nitro storage should contain the
serializable `dynamic` rule definitions instead.

At runtime, each server process or Cloudflare Worker isolate creates an in-memory compiled matcher
from those definitions:

```ts
interface CompiledDynamicRedirect {
  match: (pathname: string) => Record<string, string> | null;
  destination: (params: Record<string, string>) => string;
  statusCode: 301 | 302 | 307 | 308;
}

let compiledDynamicRedirects: CompiledDynamicRedirect[] = [];
```

This does mean that a new process or isolate compiles its own matcher once during boot or first
initialization. For Cloudflare Workers, isolates can be created, evicted, and recreated, so the
compilation may happen once per isolate lifetime. It does not happen once per request within a warm
isolate.

The expected cost is limited to the small number of explicitly enabled dynamic rules and is paid at
initialization rather than on the request hot path. A cold start therefore performs:

1. Load the serializable manifest or current dynamic rule definitions.
2. Compile the dynamic patterns and destination templates in memory.
3. Serve requests using the resulting matcher.

When a refresh, upsert, or removal changes dynamic rules, the current process rebuilds its matcher.
Other processes or Worker isolates converge through the existing refresh/storage lifecycle. The
implementation must not assume that a JavaScript function can be persisted or shared through Nitro
storage.

## Exact and dynamic lookup semantics

The existing exact lookup has two levels:

1. Exact path plus query.
2. Exact path-only fallback.

Dynamic matching is a third-level fallback:

```text
exact path + query
        ↓ miss
exact path only
        ↓ miss
first matching dynamic pathname rule
        ↓ miss
no redirect
```

Exact rules always win over dynamic rules, including path-only exact rules.

### Server-side lookup pseudocode

The current exact lookup is:

```ts
export async function findRedirect(origin: string): Promise<ResolvedRedirect | null> {
  const storage = useRedirectStorage();
  const canonicalOrigin = toRedirectOrigin(origin);
  const exact = await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(canonicalOrigin));
  if (exact) return exact;

  const path = toRedirectPath(canonicalOrigin);
  if (path === canonicalOrigin) return null;
  return (await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(path))) ?? null;
}
```

It should become conceptually:

```ts
export async function findRedirect(origin: string): Promise<ResolvedRedirect | null> {
  const storage = useRedirectStorage();
  const canonicalOrigin = toRedirectOrigin(origin);

  // 1. Exact path + query lookup.
  const exact = await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(canonicalOrigin));

  if (exact) return exact;

  // 2. Exact path-only fallback.
  const path = toRedirectPath(canonicalOrigin);

  if (path !== canonicalOrigin) {
    const pathOnly = await storage.getItem<ResolvedRedirect>(toRedirectStorageKey(path));

    if (pathOnly) return pathOnly;
  }

  // 3. The lookup function may return null as a data result.
  //    The middleware itself returns void when there is no redirect.
  if (!dynamicMatchingEnabled()) return null;

  const dynamicMatch = findCompiledDynamicRedirect(path);

  if (!dynamicMatch) return null;

  return resolveDynamicRedirect(dynamicMatch);
}
```

The storage lookups remain the hot path. Dynamic matching is reached only after both exact lookups
fail and only when the module option is enabled. It must not enumerate storage keys or access
external providers during a request.

The server middleware should translate the lookup miss into `undefined` by returning without a
value:

```ts
export default defineEventHandler(async (event): Promise<void> => {
  if (import.meta.prerender) return;
  if (!config?.serverMiddleware || !exclusions) return;

  const requestUrl = getRequestURL(event);
  if (isRedirectExcluded(requestUrl.pathname, exclusions)) return;

  const redirect = await findRedirect(`${requestUrl.pathname}${requestUrl.search}`);
  if (!redirect) return;

  await sendRedirect(event, toRedirectDestination(redirect.to), redirect.statusCode);
  return;
});
```

The `findRedirect()` helper may continue to use `null` to represent a lookup miss because it is a
data-returning function and is also used by the lookup endpoint. Middleware handlers should return
`void`/`undefined` when they do not handle a request.

### Client-side lookup pseudocode

The current client store is:

```ts
function find(origin: string): ResolvedRedirect | null {
  const canonicalOrigin = toRedirectOrigin(origin);

  return (
    redirects.value.get(canonicalOrigin) ??
    redirects.value.get(toRedirectPath(canonicalOrigin)) ??
    null
  );
}
```

It should become conceptually:

```ts
function find(origin: string): ResolvedRedirect | null {
  const canonicalOrigin = toRedirectOrigin(origin);

  // 1. Exact path + query lookup in the existing Map.
  const exact = redirects.value.get(canonicalOrigin);
  if (exact) return exact;

  // 2. Exact path-only fallback in the existing Map.
  const pathOnly = redirects.value.get(toRedirectPath(canonicalOrigin));
  if (pathOnly) return pathOnly;

  // 3. Dynamic matching is disabled unless the module option is enabled.
  if (!dynamicMatchingEnabled.value) return null;

  // 4. Dynamic rules match pathname only.
  const dynamicMatch = findCompiledDynamicRedirect(toRedirectPath(canonicalOrigin));
  if (!dynamicMatch) return null;

  return resolveDynamicRedirect(dynamicMatch);
}
```

This preserves the existing `Map` semantics exactly. The dynamic matcher is an additional fallback;
it does not replace the `Map` and does not scan its entries.

## Pattern syntax

Dynamic rules use the supported `regexparam` syntax for:

- Named parameters, such as `:section`.
- Wildcards or splats.
- Optional path segments.

Example:

```ts
{
  from: "/legacy/:section/:slug",
  to: "/docs/:section/:slug",
  statusCode: 301,
  match: "pattern"
}
```

Conceptual compilation:

```ts
const compiledPattern = compilePattern("/legacy/:section/:slug");
const compiledDestination = compileDestination("/docs/:section/:slug");

const params = compiledPattern.match("/legacy/guides/getting-started");

if (params) {
  const destination = compiledDestination(params);
  // "/docs/guides/getting-started"
}
```

### Constrained parameter groups

“Constrained parameter groups” would mean syntax such as:

```text
/users/:id<[0-9]+>
```

where `id` is captured only when it satisfies the supplied constraint. This is effectively
user-provided regular-expression content inside one parameter.

To keep the first implementation aligned with the non-goal of rejecting arbitrary regular
expressions, constrained parameter groups are excluded from this feature. The initial supported
syntax is limited to named parameters, wildcards, and optional segments. Constrained groups can be
considered separately if a bounded, safe syntax is designed and documented later.

Raw `RegExp` values and unrestricted user-defined regular-expression strings remain unsupported.

## Destination templates

Destination templates are compiled once. Per-request processing should only:

1. Match the already-compiled pattern.
2. Read captured parameters.
3. Substitute parameters into the already-compiled destination template.
4. Return the resolved redirect.

Parameter substitution must retain the existing destination-safety guarantees:

- No control characters.
- No unsafe schemes.
- No accidental host changes.
- Correct escaping for path parameters and wildcards.
- Existing handling for internal paths, protocol-relative URLs, absolute HTTP(S) URLs, and bare
  domains.

## Query-string semantics

Dynamic rules match pathname only.

Exact rules retain all current query behavior:

- Query keys and values are normalized.
- A query-specific exact rule requires the same normalized query.
- A path-only exact rule is the fallback for requests with query parameters.
- Incoming request query parameters are never appended to destinations implicitly.

Example:

```ts
{
  from: "/legacy?source=old",
  to: "/archive",
  statusCode: 301
}

{
  from: "/legacy/:slug",
  to: "/docs/:slug?source=dynamic",
  statusCode: 302,
  match: "pattern"
}
```

```text
/legacy?source=old
→ /archive

/legacy/getting-started?source=current
→ /docs/getting-started?source=dynamic

/legacy/getting-started
→ /docs/getting-started?source=dynamic
```

Pattern matching against query keys or values is outside this iteration.

## Precedence examples

Given these rules:

```ts
{
  from: "/products/:slug",
  to: "/new-products/:slug",
  statusCode: 301,
  match: "pattern"
}

{
  from: "/products/special",
  to: "/special-products",
  statusCode: 302
}

{
  from: "/products",
  to: "/product-catalog",
  statusCode: 302
}
```

The results are:

| Request                           | Result                | Reason                            |
| --------------------------------- | --------------------- | --------------------------------- |
| `/products/special`               | `/special-products`   | Exact rule wins                   |
| `/products/basic`                 | `/new-products/basic` | Dynamic rule matches              |
| `/products/basic?campaign=spring` | `/new-products/basic` | Dynamic rules match pathname only |
| `/products?campaign=spring`       | `/product-catalog`    | Exact path-only fallback wins     |
| `/unknown`                        | No redirect           | No exact or dynamic match         |

A query-specific exact rule also wins over a dynamic rule:

```ts
{
  from: "/products/basic?campaign=legacy",
  to: "/archive/basic",
  statusCode: 301
}

{
  from: "/products/:slug",
  to: "/new-products/:slug",
  statusCode: 302,
  match: "pattern"
}
```

```text
/products/basic?campaign=legacy
→ /archive/basic

/products/basic?campaign=current
→ /new-products/basic

/products/basic
→ /new-products/basic
```

## Refresh, mutation, and cache behavior

Dynamic matcher state must follow the existing redirect lifecycle:

- A complete refresh rebuilds the exact index and dynamic rule collection.
- A dynamic upsert replaces the corresponding compiled rule.
- A dynamic removal removes the corresponding compiled rule.
- Cache invalidation must cover dynamic lookup results, not only exact lookup keys.
- Existing exact lookup cache behavior remains unchanged.
- Dynamic lookup results must not be cached under an exact-only key if the dynamic rule set can
  change without invalidation.
- Multiple server instances and Worker isolates must converge on the current dynamic rule set
  through the existing refresh/storage lifecycle.

The implementation should avoid compiling every rule after an unrelated exact-only mutation if a
smaller invalidation strategy is practical, but correctness is more important than optimizing
refresh-time work.

## Server and client behavior

### Server middleware

When `serverMiddleware` and `dynamicMatching` are enabled:

- Perform exact storage lookup first.
- Fall back to the process-local compiled dynamic matcher.
- Do not access external providers during request handling.
- Do not enumerate Nitro storage keys during request handling.
- Return `void`/`undefined` when no redirect handles the request.

When `dynamicMatching` is disabled, retain the existing exact-only behavior.

### Client middleware with the Pinia store

When `store`, `routeMiddleware`, and `dynamicMatching` are enabled:

- Fetch the exact index as before.
- Fetch or receive the dynamic rule collection as a separate compact payload.
- Compile dynamic rules once after refresh.
- Use the exact `Map` first and the dynamic matcher second.

When `dynamicMatching` is disabled:

- Do not ship dynamic rules to the browser.
- Do not create a browser-side dynamic matcher.
- Preserve the current `Map` behavior and payload shape as far as possible.

### Client middleware without the Pinia store

When `routeMiddleware` is enabled but `store` is disabled:

- The lookup endpoint must apply the same exact-then-dynamic precedence.
- The endpoint must return the resolved destination and status code, not the pattern definition.
- Client navigation and server middleware must produce the same result.

## Acceptance criteria

- Add `dynamicMatching` to module options with a default of `false`.
- Dynamic matching requires both:
  - `redirects.dynamicMatching: true`; and
  - `match: "pattern"` on the individual redirect.
- Existing redirect records remain exact by default.
- Pattern records never become exact records when dynamic matching is disabled.
- Rename the exact manifest field from `redirects` to `exact` consistently across storage, runtime
  types, endpoints, tests, README, and the consumer skill.
- Exact redirects continue using the existing normalized storage keys and `Map` lookups.
- Dynamic matching is reached only after:
  1. Exact path-plus-query lookup.
  2. Exact path-only fallback.
- Exact rules always take precedence over dynamic rules.
- Dynamic-rule precedence is deterministic and documented.
- Dynamic rules support named parameters, wildcards, and optional segments.
- Constrained parameter groups are explicitly unsupported in this iteration.
- Dynamic matchers and destination templates are compiled during initialization or redirect-set
  changes, never per request or navigation.
- Cold starts may compile once per process or Worker isolate; warm requests do not recompile.
- Server middleware returns `void`/`undefined` when no redirect matches.
- Server middleware, client middleware with Pinia, and client middleware using the lookup endpoint
  behave consistently.
- Dynamic rules match pathname only.
- Query-string behavior remains explicit and backward-compatible.
- Tests cover:
  - Dynamic matching disabled.
  - Dynamic matching enabled.
  - Exact path matches.
  - Exact query matches.
  - Exact path-only fallbacks.
  - Named parameters.
  - Wildcards.
  - Optional segments.
  - Exact-over-dynamic precedence.
  - Dynamic-rule ordering.
  - Misses.
  - Trailing slashes.
  - URL encoding.
  - Destination interpolation.
  - Unsafe interpolated destinations.
  - Refreshes.
  - Webhook upserts and removals.
  - Server middleware.
  - Client middleware with the store.
  - Client middleware without the store.
- Update:
  - `modules/redirects/README.md`
  - `skills/nuxt-redirects/SKILL.md`
  - `README.md` (what's in the box descriptions)
  - Relevant public types and runtime configuration declarations.
- Add a changeset for `@onderwijsin/nuxt-redirects`.
- Add any new dependency through an exact workspace catalog entry.

## Non-goals

- Replacing the existing exact `Map` or Nitro-storage index.
- Making dynamic matching implicit based on characters in `from`.
- Building a new redirect DSL.
- Supporting arbitrary user-defined regular expressions.
- Supporting constrained parameter groups in the first implementation.
- Matching source hosts or absolute source URLs.
- Pattern matching query-string keys or values.
- Provider I/O during request handling.
- Enumerating storage during request handling.
- Persisting executable matcher functions in Nitro storage.
- Supporting unbounded dynamic rule sets or a general-purpose routing engine.
