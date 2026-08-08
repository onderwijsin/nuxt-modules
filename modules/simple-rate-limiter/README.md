# @onderwijsin/nuxt-simple-rate-limiter

Small server-side, per-IP rate limiting for Nuxt 4 endpoints. Limits are stored in Nitro storage and
can be scoped to one request path or shared across all paths.

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

`max` is the number of allowed requests in each window. `duration` and `ban` are measured in
seconds. Both helpers return nothing when allowed. When the limit is exceeded, they always throw an
H3 `429` error with `error.data.bannedUntil`, a Unix-millisecond timestamp after which the request
may be retried, and `error.data.limits`, containing the active `max`, `duration`, and `ban` values.
With `ban: 0`, `bannedUntil` is the end of the current window.

The storage namespace includes the request path and each entry is keyed by the client IP. Configure
a shared Nitro storage driver for multi-instance deployments; in-memory storage resets on restart.

## Global limits

Use `enforceGlobalRateLimit` in middleware scoped to `/api`, before any path-scoped limiter:

```ts
await enforceGlobalRateLimit(event, { max: 100, duration: 60, ban: 900 });
await enforceRateLimit(event, { max: 5, duration: 60, ban: 900 });
```

The request is counted once globally while still receiving the route-specific limit.

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
