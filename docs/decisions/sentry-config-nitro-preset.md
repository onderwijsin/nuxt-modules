# Decision: Read `NITRO_PRESET` during Sentry module setup

- **Status:** Accepted
- **Date:** 2026-08-11
- **Scope:** Sentry module setup and Nitro runtime selection

## Context

`@onderwijsin/nuxt-sentry-config` must register the Node preload or Cloudflare integration during
Nuxt module setup. During `nuxt dev`, Nitro's environment selection may exist in
`process.env.NITRO_PRESET` before Nuxt materializes it in `nuxt.options.nitro.preset`.

## Decision

The module selects the preset from `nuxt.options.nitro.preset`, then intentionally reads
`process.env.NITRO_PRESET`, and finally defaults to `node-server`. It registers the appropriate
integration at setup time. Consumers can explicitly override detection with `sentryConfig.runtime`.

This is a narrow exception to the repository preference for Nuxt configuration reads. The
environment variable is Nitro's documented build input, not an application secret or arbitrary
consumer setting.

## Alternatives considered

- Reading only resolved Nuxt Nitro options: rejected because the value may not be materialized at
  the required lifecycle stage.
- Reading arbitrary environment configuration: rejected because this exception is limited to Nitro's
  own build-selection input.
- Deferring registration until build output exists: rejected because the wrong integration would be
  registered during development.

## Consequences

Cloudflare development sessions select the correct integration early, while the module retains a
small direct environment dependency. The fallback preserves the Node server default and explicit
consumer configuration remains authoritative.

## Reconsideration criteria

Revisit this decision if Nuxt reliably exposes the preset before module setup or provides another
stable lifecycle API for selecting the Nitro integration.
