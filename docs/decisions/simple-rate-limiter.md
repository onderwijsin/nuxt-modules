# Decision: Keep the simple rate limiter best-effort

- **Status:** Accepted
- **Date:** 2026-08-11
- **Scope:** Rate-limit guarantees, storage, proxy handling, and security scope

## Context

Applications need a small utility to reduce casual abuse, but strict abuse prevention belongs at an
infrastructure boundary with atomic and distributed coordination. The module must not imply security
guarantees it cannot provide.

## Decision

The module provides per-IP, path-scoped limits through Nitro storage, with an opt-in global limit.
It is a best-effort traffic-shaping utility, not a security boundary. Storage updates are
non-atomic; in-memory storage is local to one runtime instance, and forwarded IP headers are trusted
only when an application opts in behind a trusted proxy.

It must not be the sole protection for authentication, password recovery, account enumeration,
privileged or costly operations, or any flow requiring strict enforcement. Directus remains the
authoritative security boundary for its authentication routes.

## Alternatives considered

- A general-purpose security limiter: rejected because mature security modules and infrastructure
  services provide broader, stricter controls.
- Atomic distributed enforcement in this module: rejected because it would add substantial storage
  and operational requirements outside this utility's scope.
- Trusting forwarded IP headers by default: rejected because proxy topology is application-specific.

## Consequences

The module is lightweight and useful for low-risk endpoints, but concurrent or distributed requests
may exceed configured limits. Consumers must deploy infrastructure-level controls around sensitive
flows and configure proxy trust deliberately.

## Reconsideration criteria

Revisit this decision if the module gains atomic distributed storage guarantees, or if its public
scope changes to provide a security-grade limiter.
