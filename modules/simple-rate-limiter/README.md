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

`X-Forwarded-For` is not trusted by default. Set `trustXForwardedFor: true` in a helper call only
when a trusted proxy sanitizes the header and direct origin access is prevented. With `ban: 0`,
`bannedUntil` is the end of the active window.

## Global limits

Global rate limiting is disabled by default. This keeps path-scoped limiting independent from the
global storage namespace:

```ts
export default defineNuxtConfig({
  simpleRateLimiter: {
    global: {
      enabled: true
    }
  }
});
```

Use `enforceGlobalRateLimit` in middleware scoped to `/api`, before any path-scoped limiter:

```ts
await enforceGlobalRateLimit(event, { max: 100, duration: 60, ban: 900 });
await enforceRateLimit(event, { max: 5, duration: 60, ban: 900 });
```

The request is counted once globally while still receiving the route-specific limit.

Calling `enforceGlobalRateLimit` without enabling `simpleRateLimiter.global.enabled` is a
configuration error. It logs an error once per runtime instance, does not write global storage, and
does not enforce a global limit.

### Optional pruning

Global records can be pruned by Nitro's experimental task system. Pruning is disabled by default.
The setup has three consumer-owned parts:

1. Enable pruning in the module configuration.
2. Create a task file that re-exports the module's handler.
3. Enable Nitro tasks and map a cron expression to the task name.

Enable pruning in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  simpleRateLimiter: {
    global: {
      enabled: true,
      pruning: {
        enabled: true,
        staleAfter: 86400
      }
    }
  }
});
```

The module provides the handler but does not register or schedule the task. Create this file at
`server/tasks/simple-rate-limiter/prune.ts` in the consumer application:

```ts
// server/tasks/simple-rate-limiter/prune.ts
export { default } from "@onderwijsin/nuxt-simple-rate-limiter/runtime/prune-task";
```

The directory and filename determine the task name: `server/tasks/simple-rate-limiter/prune.ts`
becomes `simple-rate-limiter:prune`. Add that exact name to `nitro.scheduledTasks`, and enable
Nitro's experimental task support:

```ts
export default defineNuxtConfig({
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      "0 * * * *": ["simple-rate-limiter:prune"]
    }
  }
});
```

The cron expression is owned by the consumer, so it can be changed without changing the module
configuration. The task is run only when both `simpleRateLimiter.global.enabled` and
`simpleRateLimiter.global.pruning.enabled` are `true`; otherwise the handler logs an error and does
not modify storage. Nitro task support is experimental, so use this setup only on deployment targets
that support Nitro tasks. If tasks are unavailable, leave pruning disabled or perform equivalent
cleanup externally.

Global durations are supplied per helper call and are not stored with each timestamp, so the task
cannot derive an individual entry expiration. `staleAfter` is therefore a retention threshold, not
an automatic margin added to every duration; it should be at least as long as any global rate-limit
window or ban that must be preserved. When pruning is enabled, the module logs an error if it
observes a global duration longer than `staleAfter`. The task reports scanned, pruned, and retained
record counts without logging client IPs.

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

Developed and tested against Node.js 24 and Nuxt 4.5.x. Versions outside the current CI matrix are
not continuously tested. Nuxt 3 is not guaranteed.
