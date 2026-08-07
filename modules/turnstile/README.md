# @onderwijsin/nuxt-turnstile

Nuxt 4 integration for Cloudflare Turnstile. It configures `@nuxtjs/turnstile`, provides the
auto-imported `useTurnstile()` composable with Nuxt UI toast feedback, and exposes a server helper
for action-aware token validation.

## Installation

```sh
pnpm add @onderwijsin/nuxt-turnstile
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-turnstile"],
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY ?? "",
    secretKey: process.env.TURNSTILE_SECRET_KEY ?? ""
  }
});
```

The module registers `@nuxtjs/turnstile` and `@nuxt/ui` as Nuxt module dependencies. The normal Nuxt
UI stylesheet setup is still required. `siteKey` is public; keep `secretKey` server-only and
override it at runtime with `NUXT_TURNSTILE_SECRET_KEY` when appropriate.

Trusted administrator requests can bypass Turnstile with `adminToken` and `adminHeaderName` (default
`x-admin-token`). The token is private runtime configuration; `Authorization: Bearer <token>` is
also accepted.

## Public API

- `useTurnstile()` is auto-imported in app code.
- `assertTurnstileToken(event, expectedAction)` is exported from
  `@onderwijsin/nuxt-turnstile/runtime`.
- `TURNSTILE_TOKEN_HEADER` is exported from the runtime subpath and is `x-turnstile-token`.
- Turnstile error types and helpers are exported from the runtime subpath.

## Compatibility

- Nuxt 4 and Node.js 22+
- Node and Cloudflare Workers-compatible server runtime
- No Sentry dependency or telemetry is included
