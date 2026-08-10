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

Normal path lookups use `readItems` with `limit: 1`. Versioned preview first resolves the main item
ID, then fetches that item's selected version with `readItem(mainItemId, { version })`; Directus
versions are addressed by their main item ID. Preview tokens are request-scoped and are never
exposed through public runtime configuration.

The default preview query keys are `preview`, `token`, `version`, and `id`; they can be renamed with
`preview.queryKeys`. Preview mode is enabled by default, but setting `preview.enabled` to `false`
ignores all preview parameters. Setting `preview.versioning` to `false` ignores only the version
parameter while retaining other preview behavior.

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

The session snapshot is persisted with the access and rotating refresh token in a bounded plain
`httpOnly` cookie and projected into Nuxt state during SSR, so hydration does not require a session
fetch. Access and refresh tokens never enter client state or application code. The cookie is not
encrypted or signed in this first release; Directus remains the authorization boundary.

Directus MFA failures are exposed through `useDirectusError(error).isOtpError`, allowing the UI to
ask for an OTP and retry `auth.login`.

Authentication routes are registered under `/_directus/auth/`: `login`, `refresh`, `logout`,
`session`, `password-request`, and `password-reset`. Refresh happens immediately before an
authenticated Directus request when it enters the configured safety window. Concurrent refreshes are
coalesced through Nitro storage. Cross-instance coordination requires a shared, read-after-write
consistent Nitro storage driver; the default in-memory driver cannot provide that guarantee, and
deployment-level refresh races remain possible otherwise.

## Generated types

When type generation is enabled, use generated collection types and `Schema` with type-only imports:

```ts
import type { Article, Schema } from "#directus";
```

Generation uses only `baseUrl` and `typegen.introspectionToken`. It regenerates in CI and
production; the cache is a development-only optimization and includes a generator/options
fingerprint. The six built-in augmentations are opt-in and individually configurable.
`typegen.rules` applies deterministic collection/field type replacements, and `typegen.transform` is
a final build-time source hook. Missing credentials produce an empty `Schema` only in development
(or when typegen is disabled); production and CI fail clearly when generation is enabled without
credentials.

## Live preview and framing

Configure Directus Live Preview to open the application URL with the module's preview query
parameters. The application must allow Directus in its `frame-src` policy, and the application must
be allowed by its own `frame-ancestors` policy. A version placeholder should be included in the
configured preview URL when versioned content is required. The module does not refresh pages
automatically; the application decides how to react to iframe updates.

## Troubleshooting

- A browser request failing with a Directus permission error is expected when the selected session,
  static token, or unauthenticated role lacks access. The proxy is not an authorization layer.
- A missing generated type in production usually means `DIRECTUS_URL` or
  `DIRECTUS_INTROSPECTION_TOKEN` was not available during `nuxt prepare`/build.
- A local auth cookie normally needs `auth.cookie.secure: false` when the playground is served over
  plain HTTP. Keep the secure default in deployed environments.
- A preview lookup returns `null` when the application path filter matches no item; preview mode
  does not change lookup semantics or turn an item path into a Directus primary key.

## Security and compatibility

- Directus URLs, credentials, and session tokens are server-only.
- Browser requests cross the same-origin proxy, which strips caller-supplied credential and origin
  headers.
- Directus permissions remain the final authorization boundary.
- Supported environments are Nuxt 4 and Node.js 22 or newer.
