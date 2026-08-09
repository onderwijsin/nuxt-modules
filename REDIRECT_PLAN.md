# Redirects module migration plan

## Goal

Migrate the copied local redirects module into a publishable, source-agnostic Nuxt module. External
systems remain the source of truth; the module maintains a fast Nitro storage index used by server
and client redirect handling.

## Public contract

- Consumers define refresh sources in `server/redirects/**` with
  `defineRedirectSource(async (event) => Redirect[])`.
- A redirect has the minimal provider-independent shape `{ from, to, statusCode? }`.
- `from` is canonicalized when ingested, including its query string. A request with a query matches
  only an origin with the same normalized query; a path-only origin matches requests regardless of
  query.
- Sources are discovered in lexicographic path order. The first source wins when sources provide the
  same canonical origin; the first occurrence also wins within one source. Duplicates are logged
  prominently, never throw, and do not replace the established redirect.
- Provider-specific webhook routes belong to the consumer. Public runtime helpers upsert and remove
  normalized records without knowing a provider payload or authentication scheme.

## Storage and caching

- The module uses the configurable `redirects.storageMount` (default `redirects`) and leaves Nitro
  to resolve its storage driver. Consumers configure any Nitro-supported driver, such as Redis,
  under that mount name in `nuxt.config`.
- Path middleware reads an individual canonical storage key, keeping the hot path O(1).
- Refresh also writes a compact manifest for the list endpoint. The list endpoint never enumerates
  storage keys and is wrapped in `defineCachedEventHandler` with configurable cache settings.
- A second cached path endpoint, `/api/_redirects/:path`, supports route middleware when the Pinia
  store is disabled. It normalizes the requested route and performs the same O(1) storage lookup.
- Refresh validates and merges all source data before applying the winning index. The index is then
  updated in the background path; request middleware never calls a source.

## Runtime switches

- `serverMiddleware`: enable or disable server redirect execution.
- `store`: enable or disable the Pinia redirect index and its background fetch.
- `routeMiddleware`: enable or disable client navigation redirects.
- Route middleware uses the Pinia `Map` when `store` is enabled; otherwise it calls the dedicated
  path endpoint. The three switches are independent except that route middleware requires the
  module's API routes.

## Refresh execution

- The module generates one Nitro startup plugin from `server/redirects/**`. It registers sources
  once per server instance; consumers re-export the package task under their own
  `server/tasks/redirects/refresh.ts` directory and schedule it through Nitro.

## Implementation sequence

1. Create package metadata, module entrypoint, generated source registry, public types, runtime
   exports, playground, consumer skill, and external-consumer fixture entry.
2. Implement canonical URL/query keys, boundary validation, storage manifest, refresh merging, and
   provider-agnostic mutation helpers.
3. Register cached list/path handlers and optional server middleware.
4. Add Pinia module dependency, `Map`-backed client store, background plugin, and optional route
   middleware fallback endpoint behavior.
5. Replace copied tests with package-owned tests for source precedence, query matching, storage
   drivers, refresh, endpoints, and runtime configuration.
6. Document source authoring, precedence, query semantics, webhook adapters, task installation,
   storage-driver overrides, cache options, and multi-instance behavior; add a changeset.
