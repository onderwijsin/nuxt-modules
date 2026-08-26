# Decision: Enforce redirect timing at existing lookup points

- **Status:** Accepted
- **Date:** 2026-08-26
- **Scope:** `@onderwijsin/nuxt-redirects` server and client redirect resolution

## Context

Redirect records may have activation and expiration windows, but storage, API, and browser-store
refreshes are intentionally asynchronous. Rechecking every cached response or bypassing cache would
improve temporal freshness at the cost of request and navigation performance.

## Decision

The redirects module enforces `activeFrom <= now < activeUntil` when a record is already being
resolved by an existing server storage lookup, dynamic matcher, or in-memory Pinia lookup. These
checks must not mutate storage.

The client does not bypass or revalidate the cached single-redirect endpoint before navigation. A
cached response may therefore redirect during a short stale window after its timing metadata has
become inactive. This is an accepted correctness/performance trade-off.

## Alternatives considered

- Revalidate every cached API response before navigation: rejected because it adds client-side
  freshness work and may require another network operation or cache bypass on the navigation path.
- Remove or aggressively shorten redirect cache TTLs: rejected because cache freshness must not
  determine normal redirect performance or storage load.

## Consequences

Existing lookup paths gain a negligible timestamp comparison while preserving their current storage
and cache access patterns. Persisted Pinia records become inactive without a store refresh. Cached
single-lookup responses can remain stale until their normal TTL or explicit invalidation, so exact
temporal correctness is not guaranteed for that path.

## Reconsideration criteria

Revisit this decision if stale-cache redirects create material user, SEO, compliance, or security
impact, or if a zero-additional-cost cache-aware validation mechanism becomes available.
