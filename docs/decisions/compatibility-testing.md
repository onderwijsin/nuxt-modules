# Decision: Define the compatibility testing policy

- **Status:** Accepted
- **Date:** 2026-08-15
- **Scope:** Supported Node, Nuxt, and deployment-runtime validation

## Context

The repository must define which runtime and dependency combinations are supported and continuously
validated. A full matrix across Node, Nuxt, and deployment runtimes would multiply the already
substantial package and clean-consumer test cost.

## Decision

The repository supports and continuously validates Node.js 24 as its baseline. It validates against
the Nuxt version pinned in the catalog and its resolved dependency graph. Public modules may declare
a broader Nuxt compatibility range when the implementation reasonably supports it, but that
declaration is an implementation target rather than evidence that every version is continuously
tested.

The clean external consumer validates the primary Node/Nitro path. Modules may include
runtime-portable or Cloudflare-specific implementations, including `cloudflare_module` support, but
the repository does not maintain a Node-versus-Cloudflare matrix or a separate Cloudflare consumer
job for every package. Older Node versions, including Node.js 22, may work but are untested and
unsupported unless this policy changes.

## Alternatives considered

- A Node-version matrix: rejected because current organizational needs do not justify the compute
  and maintenance cost.
- A Nuxt-version matrix: rejected because the workspace pins and validates one dependency graph.
- A separate Cloudflare consumer job for every package: rejected because Cloudflare compatibility is
  an implementation contract where documented, not a universal release matrix.

## Consequences

Validation is predictable and affordable, and the supported baseline is explicit. Compatibility bugs
outside the pinned graph or primary Node/Nitro path may go undetected. Cloudflare-specific code
still needs to preserve its runtime contract and should receive focused validation when changed.

## Reconsideration criteria

Revisit this decision if external adoption, client requirements, recurring compatibility
regressions, or deployment needs make matrix testing valuable.
