# Decision: Coordinate Directus refreshes with reusable sealed results

- **Status:** Accepted
- **Date:** 2026-09-05
- **Scope:** Directus refresh coordination in `@onderwijsin/nuxt-directus-client`

## Context

Directus may rotate a refresh token when a refresh request succeeds, including when the response is
lost. Concurrent requests must therefore not submit the same refresh token more than once. The
module supports both single-process deployments and deployments with multiple processes, replicas,
or Cloudflare isolates.

The coordinator must protect that refresh-token invariant without owning authentication policy. It
must coordinate execution and share only state that another request can safely reuse. Session
interpretation, sealing, cookie handling, and terminal-versus-transient error policy remain owned by
`refresh.ts`.

## Decision

Use a small internal coordinator with interchangeable process-local memory and Redis backends.

- Memory coordination is process-local. It tracks one in-flight operation per refresh key and keeps
  the resulting reusable flight briefly after completion.
- Redis coordination is required for multi-process, multi-replica, and multi-isolate deployments. It
  uses a Redis lease acquired atomically with `SET ... NX EX`, a separately published result, and
  owner-safe compare-and-delete release through a small Lua script.
- A Redis owner checks for a published result both before acquiring the lease and again immediately
  after acquiring it. If the second check finds a result, it reuses the result and does not call
  Directus.
- A follower waits for a published result, lease disappearance, or a bounded deadline. The wait is
  longer than the Directus request timeout and shorter than the lease lifetime.
- A completed refresh or terminal failure is reusable for five seconds. A transient failure is
  reusable for one second to suppress an immediate burst without extending the outage window.
- If a refresh succeeds locally but Redis result publication fails, the owner still uses its local
  result and retains the lease until its natural expiry. Releasing it early could allow a stale
  caller to submit an already-rotated refresh token.

The coordinator exposes an explicit distinction between owner-local and shared results. Owners may
receive the unsealed session and original error. Followers receive only a reusable `RefreshFlight`:
either a sealed session or a terminal/transient failure outcome. Followers restore completed
sessions from the sealed value and adopt the resulting cookie for their own response.

## Alternatives considered

- A process-local singleton for every deployment: rejected because it cannot coordinate across
  processes, replicas, or isolates.
- Rechecking Redis with `GET` followed by an ordinary `SET`: rejected because lease acquisition must
  remain atomic and must not reopen the refresh-token race.
- Sharing the owner's session value or original error: rejected because unsealed sessions and
  request-local errors are not reusable across requests.
- Releasing a Redis lease whenever local execution finishes: rejected because publication failure
  after token rotation must keep a safety barrier until the lease expires.
- A generic distributed-lock framework or lease renewal: rejected as unnecessary complexity for this
  narrowly scoped refresh coordination contract.

## Consequences

Memory deployments get lightweight single-flight behavior but must use Redis when refresh
coordination needs to span runtime instances. Redis adds an operational dependency and bounded
polling, but prevents duplicate refresh submissions across instances and keeps follower behavior
consistent with memory coordination.

Only sealed sessions cross the coordination boundary. Redis coordination data is sensitive
infrastructure and has short lifetimes; malformed published data is treated as absent and backend
failures become transient authentication failures rather than invalid credentials.

The lease is intentionally not renewed. The Directus request timeout is ten seconds, the follower
wait is twelve seconds, and the lease is thirty seconds, leaving headroom for publication and
cleanup while ensuring a legitimate refresh is not abandoned too early by followers.

## Reconsideration criteria

Revisit this decision if Directus changes refresh-token rotation guarantees, if the module adopts a
different shared-storage contract, or if production evidence shows that the fixed lease and result
windows cannot safely cover supported runtime latency. Any replacement must preserve the invariant
that a stale refresh token is not submitted concurrently or immediately after a successful rotation.
