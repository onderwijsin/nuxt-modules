---
"@onderwijsin/nuxt-redirects": patch
"@onderwijsin/nuxt-healthcheck": patch
"@onderwijsin/nuxt-markdown-renderer": patch
"@onderwijsin/nuxt-directus-client": patch
---

Compile generated server entrypoints and their dependencies through Nitro in development and production so virtual runtime imports resolve correctly.

Migration: no application code or configuration changes are required. Upgrade the affected modules
you use, restart the Nuxt development server, and rebuild and redeploy production applications.
Existing redirect sources, healthcheck components, metadata routes, and Directus user mappers keep
their current APIs and configuration.

If you replaced a Directus-backed redirect source with manual REST requests to avoid
`ERR_PACKAGE_IMPORT_NOT_DEFINED` for `#imports`, you may switch back to the documented
`@onderwijsin/nuxt-directus-client/runtime/server` entrypoint after upgrading
`@onderwijsin/nuxt-redirects`. Keeping the REST source is also supported; removing that workaround
is optional.
