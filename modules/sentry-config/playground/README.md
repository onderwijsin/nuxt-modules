# Sentry config playground

This playground tests the module against the real Cloudbase Sentry project. It can perform real
source-map uploads when `SENTRY_UPLOAD_SOURCE_MAPS=true` and the Sentry environment variables in the
playground's `.env.schema` resolve successfully through Proton Pass.

Authenticate `pass-cli` before development. Do not commit credentials or reuse a production auth
token for local experimentation.

## Diagnostic tools

The module supplies the playground diagnostics at [/_sentry](/_sentry), rather than the playground
itself defining a page or server endpoint. This exercises the same module-owned client-error page
and rate-limited server-error route that consumers receive.

## Cloudflare preview

Build the Cloudflare Worker, then use the included Wrangler configuration to run the generated
Worker and its public assets locally:

```sh
pnpm build:cloudflare
pnpm exec wrangler dev
```

The configuration enables `nodejs_compat`, which the generated Nitro/Sentry Worker requires.
