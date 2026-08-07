---
name: nuxt-healthcheck
description:
  Use when integrating @onderwijsin/nuxt-healthcheck, configuring built-in dependency probes, or
  adding server-side custom healthcheck components to a Nuxt 4 application.
---

Use `@onderwijsin/nuxt-healthcheck` for `/api/system/ping` and `/api/system/health`.

```sh
pnpm add @onderwijsin/nuxt-healthcheck
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-healthcheck"],
  healthcheck: {
    cache: { enabled: true },
    cloudinary: {
      enabled: true,
      cloudName: "demo",
      apiKey: "...",
      apiSecret: "..."
    },
    directus: {
      enabled: true,
      baseUrl: "https://directus.example.com"
    }
  }
});
```

Cache is enabled by default. Cloudinary and Directus are disabled by default. `baseUrl` must be an
absolute URL, strings must be non-empty, and threshold values are non-negative milliseconds with
`error >= warn`.

Add application-specific probes under `server/healthcheck/`:

```ts
import { defineHealthcheckComponent } from "@onderwijsin/nuxt-healthcheck/runtime";

export default defineHealthcheckComponent({
  threshold: { warn: 100, error: 500 },
  handler: async () => {
    // Perform a safe, read-only application-specific check.
    return { details: { checked: "database" } };
  }
});
```

The filename becomes the component name. Components must default-export
`defineHealthcheckComponent({ handler })`; invalid files fail with a build-time diagnostic.

`warn` produces HTTP `200`, while overall `error` produces HTTP `503`. Disabled built-ins are not
included in the response. Never return credentials or other secrets in component details.
