# Sentry config reads `NITRO_PRESET` during module setup

`@onderwijsin/nuxt-sentry-config` selects its Cloudflare integration during Nuxt module setup. It
first uses `nuxt.options.nitro.preset`, then intentionally reads `process.env.NITRO_PRESET`, and
finally defaults to `node-server`.

Nuxt/Nitro supports `NITRO_PRESET` as a build-time environment option. During `nuxt dev`, that
environment value can be available before Nuxt materializes it in `nuxt.options.nitro.preset`. The
Sentry module must choose and register either the Node preload wiring or
`sentryCloudflareNitroPlugin` at that earlier setup point; waiting for later resolved configuration
would register the wrong integration for a Cloudflare development session.

Repository modules normally avoid direct environment reads in favour of Nuxt configuration. This is
an intentional, narrow exception: `NITRO_PRESET` is Nitro's own documented build selection input,
and no equivalent resolved Nuxt option exists reliably at the required lifecycle stage. The module
does not use this mechanism for application secrets or arbitrary consumer settings. Consumers can
always set `sentryConfig.runtime` explicitly to override detection.
