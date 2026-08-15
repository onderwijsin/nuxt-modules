# Compatibility testing policy

## Decision

The repository supports and continuously validates Node.js 24 as its baseline. It does not run a
Node-version matrix. Older versions, including Node.js 22, may work but are untested and unsupported
unless this policy changes.

The workspace validates against the Nuxt version pinned in its catalog and corresponding resolved
dependency graph. Public modules may declare a broader Nuxt compatibility range when the
implementation reasonably supports it, but that declaration is an implementation target rather than
evidence that every version is continuously tested.

Modules may include runtime-portable or Cloudflare-specific implementations, including
`cloudflare_module` support. The clean external consumer validates the primary Node/Nitro path; the
repository does not maintain a Node-versus-Cloudflare matrix or a separate Cloudflare consumer job
for every package. Cloudflare compatibility remains part of the implementation contract where
documented.

## Rationale

These modules primarily serve Onderwijs in's internal applications, where the supported tooling and
deployment baseline is known and controlled. The full package and clean-consumer path is already
relatively expensive. Multiplying it across Node, Nuxt, and deployment-runtime combinations would
add material compute cost and maintenance work that current organizational needs do not justify.

This policy can be revisited if external adoption, client requirements, recurring compatibility
regressions, or deployment needs make matrix testing valuable.
