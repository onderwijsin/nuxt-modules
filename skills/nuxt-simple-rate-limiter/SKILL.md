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

`duration` and `ban` are seconds. A ban returns `{ bannedUntil }` with a Unix-millisecond timestamp;
return or throw a `429` response from the handler using that value. The limiter uses Nitro storage,
separates entries by request path, and keys each path by client IP. Use shared Nitro storage when
the application runs on multiple instances.

This module is intentionally simple. Use infrastructure-level rate limiting (such as a CDN, WAF, API
gateway, load balancer, or dedicated distributed limiter) when rate limiting is a production
security requirement.
