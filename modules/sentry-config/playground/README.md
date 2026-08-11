# Sentry config playground

This playground tests the module against the real Cloudbase Sentry project. It can perform real
source-map uploads when `SENTRY_UPLOAD_SOURCE_MAPS=true` and the Sentry environment variables in
`.env.example` are populated.

Keep credentials in the local, ignored `.env` file. Do not commit credentials or reuse a production
auth token for local experimentation.

## Cloudflare preview

Build the Cloudflare Worker, then use the included Wrangler configuration to run the generated
Worker and its public assets locally:

```sh
pnpm build:cloudflare
pnpm exec wrangler dev
```

The configuration enables `nodejs_compat`, which the generated Nitro/Sentry Worker requires.
