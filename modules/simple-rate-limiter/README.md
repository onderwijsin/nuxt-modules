# @onderwijsin/nuxt-simple-rate-limiter

Small server-side, per-IP rate limiting for Nuxt 4 endpoints. Limits are stored in Nitro storage and
isolated by request path, so activity on one endpoint does not consume another endpoint's quota.

## Installation

```sh
pnpm add @onderwijsin/nuxt-simple-rate-limiter
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-simple-rate-limiter"]
});
```

## Use in a server handler

After registering the module, `enforceRateLimit` is auto-imported in Nitro server handlers:

```ts
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, {
    max: 5,
    duration: 60,
    ban: 900
  });

  return { ok: true };
});
```

It also remains available as an explicit runtime import when needed outside a Nuxt auto-import
context:

```ts
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";
```

`max` is the number of allowed requests in each window. `duration` is the window length in seconds,
and `ban` is the ban duration in seconds; set `ban` to `0` to allow another request when the current
window ends. A configured ban returns `{ bannedUntil }`, where `bannedUntil` is a Unix-millisecond
timestamp. A caller should return or throw its own `429` response using that value. Without a ban,
exceeding the request window throws an H3 `429 Too Many Requests` error.

The storage namespace includes the request path and each entry is keyed by the client IP. Configure
a shared Nitro storage driver for multi-instance deployments; in-memory storage resets on restart.

## Security boundary

This module is deliberately simple. It is useful for lightweight endpoint protection and developer
convenience, but it is not a complete production security control: application storage operations
may not be globally atomic, and deployment topology, proxy trust, and distributed traffic policies
remain outside its scope. For security-critical or high-traffic production applications, enforce
rate limiting at infrastructure level—for example through a CDN, WAF, API gateway, load balancer, or
a dedicated distributed rate-limiting service.

## Compatibility

- Nuxt 4
- Node.js 22 or newer
- Node and Cloudflare Workers-compatible server runtime
