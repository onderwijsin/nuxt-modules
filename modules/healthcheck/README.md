# @onderwijsin/nuxt-healthcheck

Configurable Nuxt health endpoints with built-in cache, Cloudinary, and Directus checks plus
server-side consumer-defined components.

## Installation

```sh
pnpm add @onderwijsin/nuxt-healthcheck
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-healthcheck"]
});
```

The module provides:

- `GET /api/system/ping`, returning plain-text `pong`;
- `GET /api/system/health`, returning the overall and per-component health status.

## Configuration

Cache is enabled by default. Cloudinary and Directus are opt-in because they require credentials or
an application URL.

```ts
export default defineNuxtConfig({
  healthcheck: {
    cache: {
      enabled: true,
      threshold: { warn: 100, error: 500 }
    },
    cloudinary: {
      enabled: true,
      cloudName: "demo",
      apiKey: "...",
      apiSecret: "...",
      threshold: { warn: 150, error: 500 }
    },
    directus: {
      enabled: true,
      baseUrl: "https://directus.example.com",
      threshold: { warn: 250, error: 750 }
    }
  }
});
```

`baseUrl` must be an absolute URL. All configured strings must be non-empty. Threshold values are
non-negative milliseconds, and `error` must be greater than or equal to `warn`. Invalid module
configuration fails during Nuxt setup with a validation error.

For production deployments, provide credentials through private Nuxt runtime configuration or its
normal environment-variable overrides. The module never places Cloudinary credentials in public
runtime configuration and never reads environment variables directly.

## Custom components

Create one component per file in `server/healthcheck/`. The filename becomes the response component
name.

```ts
// server/healthcheck/database.ts
import { defineHealthcheckComponent } from "@onderwijsin/nuxt-healthcheck/runtime";

export default defineHealthcheckComponent({
  threshold: { warn: 100, error: 500 },
  handler: async () => {
    // Run an application-specific, read-only query here.
    return { details: { checked: "database" } };
  }
});
```

The handler receives `{ event }`, may return optional `details`, and should throw when its service
is unavailable. A returned `status` may be used for an explicit `ok`, `warn`, or `error` result.
Component files must default-export `defineHealthcheckComponent({ handler })`. The module validates
filenames and exports while scanning at build time and validates the imported component shape before
the health endpoint runs.

Custom component files are server-only. Do not return secrets or credentials in `details`.

## Response behavior

Each enabled component includes `status` and `responseTimeMs`; failed checks may include `error`.
The overall status is the worst component status. `warn` returns HTTP `200`; `error` returns HTTP
`503`. Disabled built-in components are omitted from the response.
