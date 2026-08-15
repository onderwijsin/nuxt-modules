# Decision: Centralize shared Directus configuration

- **Status:** Accepted
- **Date:** 2026-08-12
- **Scope:** Directus configuration discovery, schemas, and module composition

## Context

Several Directus modules need the same instance, client, collection, and authentication
configuration. Those contracts must remain consistent without making generic module infrastructure
own Directus-domain behavior or forcing consumers to install configuration discovery.

## Decision

`@onderwijsin/nuxt-directus-config` is the domain owner for shared Directus configuration and its
side-effect-free schema export. It optionally discovers an executable `directus.config.ts` through
Jiti, validates it, and stores the result in the internal non-enumerable `nuxt.options._directus`
namespace. `directusConfig.configFile` selects an absolute or root-relative file and `false`
disables discovery.

Directus modules remain usable with direct Nuxt options. When shared configuration is installed, it
must precede consumers in the Nuxt `modules` array. Consumers merge direct options over the relevant
shared section with `defu`, then validate the composed result; direct configuration therefore wins,
including nested fields. Arrays are replaced rather than combined.

`#directus-config` is a sanitized client projection, while `#directus-config-server` contains the
complete validated server-only configuration. Sensitive fields are marked on their owning schemas,
and the public projection is derived from that metadata.

## Alternatives considered

- Generic `@onderwijsin/nuxt-module-utils` ownership: rejected because it would couple generic
  infrastructure to Directus-domain contracts.
- Automatic registration through package dependencies: rejected because configuration discovery is
  optional and hidden module ordering would be unsafe.
- A manually maintained public allowlist: rejected because it can drift from the complete schema and
  expose sensitive values.

## Consequences

Directus modules share one validated contract and retain direct-only compatibility. Consumers must
respect module ordering when using discovery, and configuration files execute during setup through
Jiti. Server and client aliases have explicit trust boundaries, while array replacement gives
consumers a complete override mechanism.

## Reconsideration criteria

Revisit this decision if Nuxt provides a safer shared configuration lifecycle, if Directus modules
need a different composition model, or if the server/client trust boundary changes.
