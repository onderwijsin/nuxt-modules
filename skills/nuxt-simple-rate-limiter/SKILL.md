---
name: nuxt-simple-rate-limiter
description:
  Use when adding path-scoped server-side request rate limiting with
  @onderwijsin/nuxt-simple-rate-limiter in a Nuxt 4 application.
---

# Nuxt Simple Rate Limiter

Use `@onderwijsin/nuxt-simple-rate-limiter` in Nitro server handlers that need a small per-IP rate
limit.

```sh
pnpm add @onderwijsin/nuxt-simple-rate-limiter
```

```ts
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, { max: 5, duration: 60, ban: 900 });
});
```

Register the module in `nuxt.config.ts`; it auto-imports `enforceRateLimit` in Nitro server
handlers. The helper is also available as an explicit runtime import from
`@onderwijsin/nuxt-simple-rate-limiter/runtime` outside that context.

`duration` and `ban` are seconds. Both helpers return nothing when allowed and throw a `429` with
`error.data.bannedUntil` and `error.data.limits` when exceeded. `limits` contains the active `max`,
`duration`, and `ban` values. The limiter uses Nitro storage, separates route entries by request
path, and keys entries by client IP. Use shared Nitro storage when the application runs on multiple
instances.

For one quota across all API paths, call `enforceGlobalRateLimit` before route-specific checks.

This module is intentionally simple. Use infrastructure-level rate limiting (such as a CDN, WAF, API
gateway, load balancer, or dedicated distributed limiter) when rate limiting is a production
security requirement.
