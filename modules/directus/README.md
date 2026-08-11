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
    baseUrl: process.env.DIRECTUS_URL!,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  }
});
```

Keep `baseUrl` and `staticToken` server-only. Never put Directus credentials in
`runtimeConfig.public` or browser code.

`baseUrl` is required whenever the module is enabled, including when type generation is disabled.
Set `directus.enabled: false` when an application does not configure Directus.

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

## Composables

All composables below are auto-imported. Import commands that are not configured in
`directus.commands` directly from `@directus/sdk`.

### `useDirectus`

```ts
useDirectus<Output>(command: RestCommand<Output, Schema>): Promise<Output>
```

Runs a Directus REST command in Vue code. In the browser, it uses the configured same-origin proxy;
during SSR, it talks to Directus directly. The module selects the server-side credential, so callers
cannot supply one through request headers.

### `useDirectusServer`

```ts
useDirectusServer<Output>(command: RestCommand<Output, Schema>, event?: H3Event): Promise<Output>
```

Runs a command from Nitro. Pass the current event to apply its preview context and, when
authentication is enabled, its session.

### `useDirectusItemByPath`

```ts
useDirectusItemByPath(collection, query): Promise<Item | null>
```

Returns the first item matching a Directus query, or `null`. It is intended for route lookups such
as a page by slug and automatically applies the current route's preview context.

### `useDirectusServerItemByPath`

```ts
useDirectusServerItemByPath(event, collection, query): Promise<Item | null>
```

The Nitro equivalent of `useDirectusItemByPath`. Use it from server handlers when the lookup must
read preview values from the request event.

### `useDirectusError`

```ts
useDirectusError(error: unknown): DirectusErrorResult
```

Normalizes Directus, SDK, `ofetch`, H3, and malformed errors. The result has `isDirectusError`, a
safe `errors` list, an optional `statusCode`, and flags for OTP, invalid credentials, forbidden,
expired or invalid tokens, validation, rate-limit, service-unavailable, and route-not-found errors.
Unknown errors return the same flags as `false` with an empty `errors` list.

### `useDirectusAuth`

`useDirectusAuth` is available only when `auth.enabled` is true. Its full state and method reference
is in [Authentication](#authentication).

## Configuration

All options are configured under `directus`:

| Option                       | Default                             | Contract                                                                                          |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `enabled`                    | `true`                              | Enables the module.                                                                               |
| `baseUrl`                    | —                                   | Required when enabled; must be an HTTP(S) URL.                                                    |
| `staticToken`                | —                                   | Optional server-only static credential.                                                           |
| `proxy.path`                 | `/_directus/proxy`                  | Absolute local same-origin browser proxy path. Root paths and auth-route collisions are rejected. |
| `commands`                   | `[readItem, readItems]`             | SDK commands to auto-import. Unsupported names are rejected.                                      |
| `preview.enabled`            | `true`                              | Enables preview query parsing and request-scoped preview credentials.                             |
| `preview.versioning`         | `true`                              | Enables versioned preview lookup.                                                                 |
| `preview.queryKeys`          | `preview`, `token`, `version`, `id` | Query parameter names used for preview context.                                                   |
| `auth.enabled`               | `false`                             | Enables cookie authentication, authentication routes, and `useDirectusAuth`.                      |
| `auth.turnstile.enabled`     | `false`                             | Registers Turnstile and protects login plus password-reset-email requests.                        |
| `auth.cookie.name`           | `directus_session`                  | Session cookie name.                                                                              |
| `auth.cookie.secure`         | `true`                              | Sends the cookie only over HTTPS. Use `false` only for local HTTP development.                    |
| `auth.cookie.sameSite`       | `lax`                               | Cookie `SameSite` policy.                                                                         |
| `auth.cookie.path`           | `/`                                 | Cookie path.                                                                                      |
| `auth.cookie.maxAge`         | `2592000`                           | Cookie lifetime in seconds.                                                                       |
| `auth.cookie.domain`         | —                                   | Optional cookie domain.                                                                           |
| `auth.refreshSafetyWindow`   | `30000`                             | Refreshes a session this many milliseconds before expiry.                                         |
| `auth.passwordResetUrl`      | —                                   | Required for password-request support; sent to Directus as `reset_url`.                           |
| `typegen.enabled`            | `true`                              | Enables generated `#directus` declarations.                                                       |
| `typegen.introspectionToken` | —                                   | Server-only Directus schema introspection token.                                                  |
| `typegen.cache.maxAge`       | `3600000`                           | Development type-generation cache lifetime in milliseconds.                                       |
| `typegen.augmentations`      | all `true`                          | Optional generated-output transforms.                                                             |
| `typegen.rules`              | `{}`                                | Generated field type overrides keyed by collection and field.                                     |
| `typegen.transform`          | —                                   | Final build-time source transform.                                                                |

The module validates options during Nuxt configuration. Production and CI type generation require
both `baseUrl` and `typegen.introspectionToken` when it is enabled.

## Version previews

Directus Content Versions are independent, unpublished changes to a main item. A version has a
key—the value Directus uses in the REST `version` query parameter—and the main item remains the
canonical item. When the preview URL contains `preview=true`, an item `id`, and a version key,
`useDirectusItemByPath` and `useDirectusServerItemByPath` read that item with the selected version.
Without a valid version context, they retain their normal first-matching-item lookup behavior.

Configure Directus before relying on version previews:

1. In **Settings → Data Model**, enable **Content Versioning** for each previewed collection and
   create versions in the item editor.
2. Set the collection's Preview URL to your application route. Insert the item **ID** and
   **Version** dynamic values so it supplies the module's default query names, for example
   `https://app.example.test/pages/{{slug}}?preview=true&id={{id}}&version={{version}}`.
3. Previewing unpublished content also needs a credential that can read it. We recommend
   [Tokenized Preview Endpoint for Directus](https://github.com/formfcw/directus-extension-tokenized-preview):
   install it in Directus, configure its preview base URL, and prefix the collection Preview URL
   with its `/preview/` endpoint. It appends a short-lived `token` to the application URL. Keep its
   `TOKENIZED_PREVIEW_TOKEN_KEY` as `token`, or set `preview.queryKeys.token` to match.

For example, an extension-backed URL can be configured as:

```ts
// Directus collection Preview URL (use Directus' dynamic-value picker for the placeholders)
/preview/https://app.example.test/pages/{{slug}}?preview=true&id={{id}}&version={{version}}
```

The default preview query keys are `preview`, `token`, `version`, and `id`; they can be renamed with
`preview.queryKeys`. Tokens stay request-scoped and are never exposed through public runtime
configuration. Set `preview.enabled` to `false` to ignore all preview parameters, or
`preview.versioning` to `false` to ignore only the version. This section covers credentialed lookup,
not the embedded editor; see [Live preview and framing](#live-preview-and-framing) for that setup.

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

### `useDirectusAuth` API

The composable exposes a token-free, reactive session projection:

| State                  | Type                                                 | Contract                                                                                  |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `auth._session`        | `DeepReadonly<Ref<DirectusSessionSnapshot \| null>>` | Read-only snapshot containing `userId` and optional `email`, `firstName`, and `lastName`. |
| `auth.isAuthenticated` | `DeepReadonly<ComputedRef<boolean>>`                 | `true` when a snapshot exists.                                                            |
| `auth.userId`          | `DeepReadonly<ComputedRef<string \| undefined>>`     | Current user ID.                                                                          |

The snapshot deliberately contains no access or refresh token, role, policy, or permission helpers.

| Method            | Signature                                                | Behavior                                                                                                                                                              |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`           | `login({ email, password, otp? }, meta?): Promise<void>` | Authenticates, fetches the selected current-user fields, writes the session cookie, updates state, and emits `directus:auth:login`.                                   |
| `refresh`         | `refresh(): Promise<void>`                               | Refreshes and rotates the token pair, updates state, and emits `directus:auth:refresh`. On failure it clears state, emits `directus:auth:invalidated`, then rethrows. |
| `logout`          | `logout(): Promise<void>`                                | Attempts upstream logout, always clears local state and cookie, and emits `directus:auth:logout`. An upstream failure is rethrown after cleanup.                      |
| `passwordRequest` | `passwordRequest(email, meta?): Promise<void>`           | Requests a password-reset email using `auth.passwordResetUrl`.                                                                                                        |
| `passwordReset`   | `passwordReset(token, password): Promise<void>`          | Completes a Directus password reset.                                                                                                                                  |

`meta` may be `{ turnstileToken?: string }` when Turnstile protection is enabled.

Directus MFA failures are exposed through `useDirectusError(error).isOtpError`, allowing the UI to
ask for an OTP and retry `auth.login`.

When `auth.enabled` is `false`, Directus session cookies are ignored: they are not read, refreshed,
forwarded upstream, or added to the SSR payload. Static, preview, and unauthenticated access remain
available.

Authentication routes are registered under `/_directus/auth/`: `login`, `refresh`, `logout`,
`session`, `password-request`, and `password-reset`. Refresh happens immediately before an
authenticated Directus request when it enters the configured safety window. Concurrent refreshes are
coalesced through Nitro storage. Cross-instance coordination requires a shared, read-after-write
consistent Nitro storage driver; the default in-memory driver cannot provide that guarantee, and
deployment-level refresh races remain possible otherwise.

Authentication mutations require an `Origin` or `Referer` matching the application origin. Missing
or cross-origin metadata is rejected with `403`, including when the session cookie uses
`sameSite: "none"`.

### Turnstile protection

Set `auth.turnstile.enabled: true` to register `@onderwijsin/nuxt-turnstile` and require a Turnstile
token for login and password-reset-email requests. Configure the Turnstile site and secret keys
through the usual top-level `turnstile` option. Follow the
[Turnstile module guide](../turnstile/README.md) to configure keys, render the widget, and manage
the token lifecycle. The Directus module exposes the required widget actions through public runtime
config, and the optional second argument to each auth method forwards the token in
`x-turnstile-token`:

```ts
const config = useRuntimeConfig();
const auth = useDirectusAuth();
const token = await getTokenWithRetry();

await auth.login({ email: "user@example.test", password: "password" }, { turnstileToken: token });

const passwordRequestAction = config.public.directus.auth.turnstile.actions.passwordRequest;
```

Use `config.public.directus.auth.turnstile.actions.login` for the login widget and `passwordRequest`
for the password-reset-request widget. Tokens are required only when the option is enabled; reset
each widget after its submission because Turnstile tokens are single-use.

## Generated types

When type generation is enabled, the module uses
[directus-sdk-typegen](https://github.com/bryantgillespie/directus-sdk-typegen) to inspect your
Directus schema and expose collection interfaces plus `Schema` from the virtual `#directus` module:

```ts
import type { Article, Schema } from "#directus";
```

Configure it under `directus.typegen`:

| Option               | Use it when                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`            | Set to `false` to skip generation. An existing declaration is reused when available; otherwise `Schema` is empty.                                                                                       |
| `introspectionToken` | Supply a server-only token with enough Directus permissions to inspect the schema. It is required for enabled generation outside local development.                                                     |
| `cache.maxAge`       | Adjust the development-only cache lifetime (milliseconds). CI and production always regenerate.                                                                                                         |
| `augmentations`      | Individually disable a generated-output transform when its default normalization does not fit your schema. All default to `true`.                                                                       |
| `rules`              | Replace a generated field type deterministically, keyed by collection then field: `{ articles: { body: "RichText" } }`. Values must be a single TypeScript type expression.                             |
| `transform`          | Apply a final build-time function to the generated source. It receives the source and metadata including the Directus URL, generator version, collection names, and rules, and must return source text. |

| Augmentation                       | Effect                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `removeEnums`                      | Removes generated `export enum` declarations.                                  |
| `replaceAnyWithUnknown`            | Rewrites generated `Record<…, any>` values to `Record<…, unknown>`.            |
| `replaceJsonWithJSON`              | Rewrites quoted `"json"` field types to `JSON`.                                |
| `applyTypeNameOverrides`           | Applies the module's reviewed generated type-name corrections.                 |
| `makeNonNullableOptionalsRequired` | Makes simple optional fields required when their type does not include `null`. |
| `mergeJsDocs`                      | Merges adjacent generated JSDoc tag blocks and removes duplicate tags.         |

They run in the shown order before `rules`, followed by `transform`. Missing or incomplete
credentials reuse the previous declaration—or produce an empty `Schema`—only in local development;
CI and production fail clearly instead.

## Proxy endpoint

The browser endpoint at `proxy.path` (default `/_directus/proxy`) forwards REST requests to the
configured Directus instance. This lets browser code use `useDirectus` without learning the Directus
URL or receiving a static, preview, or session token. The server chooses credentials in this order:
preview token, current session when authentication is enabled, static token, then no credential.

The proxy preserves the request method, body, query string, response status, and safe response
headers. It removes caller-supplied credential, cookie, host, origin, connection, and hop-by-hop
headers; strips the preview token from the upstream query; and never forwards upstream `Set-Cookie`
headers. Credentialed mutations (`POST`, `PUT`, `PATCH`, and `DELETE`) require a same-origin
`Origin` or `Referer` header.

It is not a general-purpose proxy, a CORS bypass, a session-token API, or an authorization layer. It
only targets the configured Directus URL, and Directus permissions remain the final access control.

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
- State-changing proxy requests that use a server credential require a matching `Origin` or
  `Referer` header. Cross-origin or headerless mutations are rejected, including when
  `sameSite: "none"` is configured.
- Authentication `POST` routes apply the same origin validation before reading input or changing a
  session.
- Directus permissions remain the final authorization boundary.
- Supported environments are Nuxt 4 and Node.js 22 or newer.
