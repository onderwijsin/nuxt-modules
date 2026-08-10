# @onderwijsin/nuxt-directus

Typed, server-safe Directus REST access for Nuxt 4. Use it for browser and SSR requests, preview
lookups, generated schema types, normalized errors, and optional cookie-backed authentication.

## Install

```sh
pnpm add @onderwijsin/nuxt-directus
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus"],
  directus: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  }
});
```

Keep `baseUrl` and `staticToken` server-only. Never put Directus credentials in
`runtimeConfig.public` or browser code.

## Quick start

The default auto-imports are `readItem` and `readItems` from `@directus/sdk` together with the
module's composables:

```ts
const articles = await useDirectus(readItems("articles", { limit: 10 }));
```

Browser requests use the same-origin proxy. SSR requests use Directus directly. Credentials are
selected on the server, so browser callers cannot override the configured credential.

For Nitro handlers, use the server composable:

```ts
export default defineEventHandler((event) =>
  useDirectusServer(readItems("articles", { limit: 10 }), event)
);
```

## Configuration

The most commonly configured options are:

| Option                       | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `baseUrl`                    | Directus HTTP(S) URL.                                                     |
| `staticToken`                | Optional server-only token for static/server access.                      |
| `proxy.path`                 | Same-origin browser proxy path; defaults to `/_directus/proxy`.           |
| `commands`                   | SDK commands to auto-import; defaults to `readItem` and `readItems`.      |
| `preview.enabled`            | Enables preview query handling; defaults to `true`.                       |
| `preview.versioning`         | Enables versioned preview lookup; defaults to `true`.                     |
| `auth.enabled`               | Enables authentication routes and `useDirectusAuth`; defaults to `false`. |
| `auth.passwordResetUrl`      | Required when using password reset requests.                              |
| `typegen.introspectionToken` | Server-only token used for schema generation.                             |

See the [consumer skill](../../skills/nuxt-directus/SKILL.md) for the complete option reference and
public API contracts.

## Preview lookup

`useDirectusItemByPath` and `useDirectusServerItemByPath` return the first matching item or `null`.
They support request-scoped preview tokens and versioned content:

```ts
const page = await useDirectusItemByPath("pages", {
  filter: { slug: { _eq: "home" } },
  fields: ["id", "title"]
});
```

Normal lookups use `readItems` with `limit: 1`. Versioned preview uses `readItem` with the item ID
and version. Preview tokens are never exposed through public runtime configuration.

## Authentication

Enable authentication with `directus.auth.enabled: true`:

```ts
const auth = useDirectusAuth();

await auth.login({
  email: "user@example.test",
  password: "password",
  otp: "123456"
});

if (auth.isAuthenticated.value) {
  console.log(auth.userId.value);
}
```

The session snapshot is persisted in an `httpOnly` cookie and projected into Nuxt state during SSR,
so hydration does not require a session fetch. Access and refresh tokens never enter client state.

Directus MFA failures are exposed through `useDirectusError(error).isOtpError`, allowing the UI to
ask for an OTP and retry `auth.login`.

Authentication routes are registered under `/_directus/auth/`: `login`, `refresh`, `logout`,
`session`, `password-request`, and `password-reset`.

## Generated types

When type generation is enabled, use generated collection types with type-only imports:

```ts
import type { Article } from "#directus";
```

Generation requires `baseUrl` and `typegen.introspectionToken` in production builds.

## Security and compatibility

- Directus URLs, credentials, and session tokens are server-only.
- Browser requests cross the same-origin proxy, which strips caller-supplied credential and origin
  headers.
- Directus permissions remain the final authorization boundary.
- Supported environments are Nuxt 4 and Node.js 22 or newer.
