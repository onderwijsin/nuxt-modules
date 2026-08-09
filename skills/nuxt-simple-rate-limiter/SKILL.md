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

Global rate limiting is opt-in. Enable it in `nuxt.config.ts` before using the global helper:

```ts
export default defineNuxtConfig({
  simpleRateLimiter: {
    global: { enabled: true }
  }
});
```

Path-scoped limiting works without global storage. Calling `enforceGlobalRateLimit` while global
limiting is disabled is a configuration error: it logs a prominent error once per runtime instance,
does not write storage, and does not enforce a global limit.

Optional stale-record pruning uses Nitro's experimental task support and is disabled by default:

```ts
simpleRateLimiter: {
  global: {
    enabled: true,
    pruning: { enabled: true, cron: "0 * * * *", staleAfter: 86400 }
  }
}
```

Enable Nitro tasks in the deployment configuration when supported. Global durations are supplied per
helper call and are not stored with each timestamp, so `staleAfter` cannot be made an automatic
margin over each entry expiration. It is measured in seconds and should cover the longest global
window or ban that must remain effective. When pruning is enabled, the module logs an error if it
observes a longer global duration. Deployments without task support can leave pruning disabled or
clean the global storage externally.

Client IP resolution does not trust `X-Forwarded-For` by default. Opt in per call only when a
trusted reverse proxy sanitizes that header and prevents direct access to the origin:

    await enforceRateLimit(event, {
      max: 5,
      duration: 60,
      ban: 900,
      trustXForwardedFor: true
    });

When disabled, H3 uses the runtime-provided client address or socket address. If `ban` is `0`,
`bannedUntil` is the end of the active window.

This module is intentionally simple. Use infrastructure-level rate limiting (such as a CDN, WAF, API
gateway, load balancer, or dedicated distributed limiter) when rate limiting is a production
security requirement.
