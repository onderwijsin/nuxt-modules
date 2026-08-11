---
name: nuxt-directus
description:
  Use @onderwijsin/nuxt-directus for typed server-safe Directus REST access, preview lookup, schema
  generation, normalized errors, and optional cookie authentication in Nuxt 4.
---

# Nuxt Directus

`@onderwijsin/nuxt-directus` provides typed Directus REST access across browser, SSR, and Nitro
code. It also provides a same-origin proxy, preview-aware item lookup, generated `#directus` types,
normalized Directus errors, and optional cookie-backed authentication.

## Installation and configuration

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

`baseUrl`, `staticToken`, and `typegen.introspectionToken` are server-only. Do not place them in
`runtimeConfig.public` or browser code.

### Complete option reference

All options are configured under `directus`.

| Option                       | Default                             | Contract                                                                                          |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| `enabled`                    | `true`                              | Enables the module.                                                                               |
| `baseUrl`                    | —                                   | Required when enabled; must use `http` or `https`.                                                |
| `staticToken`                | —                                   | Optional server-only static credential.                                                           |
| `proxy.path`                 | `/_directus/proxy`                  | Absolute local same-origin browser proxy path. Root paths and auth-route collisions are rejected. |
| `commands`                   | `[readItem, readItems]`             | SDK command names to auto-import. Unsupported names are rejected.                                 |
| `preview.enabled`            | `true`                              | Enables preview query parsing and request-scoped preview credentials.                             |
| `preview.versioning`         | `true`                              | Enables versioned preview lookup.                                                                 |
| `preview.queryKeys`          | `preview`, `token`, `version`, `id` | Query parameter names used for preview context.                                                   |
| `auth.enabled`               | `false`                             | Enables cookie authentication and registers authentication routes plus `useDirectusAuth`.         |
| `auth.turnstile.enabled`     | `false`                             | Registers Turnstile and protects login plus password-reset-email requests.                        |
| `auth.cookie.name`           | `directus_session`                  | Session cookie name.                                                                              |
| `auth.cookie.secure`         | `true`                              | Sends the cookie only over HTTPS. Use `false` only for local HTTP development.                    |
| `auth.cookie.sameSite`       | `lax`                               | Cookie `SameSite` policy.                                                                         |
| `auth.cookie.path`           | `/`                                 | Cookie path.                                                                                      |
| `auth.cookie.maxAge`         | `2592000`                           | Cookie lifetime in seconds.                                                                       |
| `auth.cookie.domain`         | —                                   | Optional cookie domain.                                                                           |
| `auth.refreshSafetyWindow`   | `30000`                             | Refreshes a session this many milliseconds before expiry.                                         |
| `auth.passwordResetUrl`      | —                                   | Required for password-request support; sent as Directus `reset_url`.                              |
| `typegen.enabled`            | `true`                              | Enables generated `#directus` declarations.                                                       |
| `typegen.introspectionToken` | —                                   | Server-only Directus schema introspection token.                                                  |
| `typegen.cache.maxAge`       | `3600000`                           | Development type-generation cache lifetime in milliseconds.                                       |
| `typegen.augmentations`      | all `false`                         | Optional generated-output transforms.                                                             |
| `typegen.rules`              | `{}`                                | Generated field type overrides keyed by collection and field.                                     |
| `typegen.transform`          | —                                   | Final build-time source transform.                                                                |

The module validates option values during Nuxt configuration. `baseUrl` is required whenever the
module is enabled, even when type generation is disabled. Set `enabled: false` when Directus is not
configured. Production type generation additionally requires `typegen.introspectionToken`.

## Public auto-imports

### `useDirectus`

```ts
useDirectus<Output>(command: RestCommand<Output, Schema>): Promise<Output>
```

Executes a typed Directus REST command. Browser calls use the same-origin proxy; SSR calls use the
direct server client. The module chooses preview, session (only with `auth.enabled`), static, or no
credential on the server. Callers cannot override that credential with request headers.

### `useDirectusServer`

```ts
useDirectusServer<Output>(
  command: RestCommand<Output, Schema>,
  event?: H3Event
): Promise<Output>
```

Executes a typed command directly from Nitro. Passing the current `H3Event` enables request-scoped
preview and, when enabled, session credential resolution.

### `useDirectusItemByPath`

```ts
useDirectusItemByPath(collection, query): Promise<Item | null>
```

Queries a collection and returns its first matching item or `null`. Normal path lookup uses
`readItems` with `limit: 1`. Versioned preview resolves the main item ID and then uses
`readItem(mainItemId, { version })`, because Directus versions are addressed by their main item ID.

### `useDirectusServerItemByPath`

```ts
useDirectusServerItemByPath(event, collection, query): Promise<Item | null>
```

Server equivalent of `useDirectusItemByPath`. It reads preview context from the supplied request
event and uses the server Directus client.

### `useDirectusError`

```ts
useDirectusError(error: unknown): DirectusErrorResult
```

Normalizes Directus, SDK, `ofetch`, H3, and malformed errors. A normalized result has:

- `isDirectusError`;
- `errors`, containing safe `message`, `code`, and `extensions` values;
- optional `statusCode`;
- `isOtpError`;
- `isInvalidCredentialError` and `invalidCredentials`;
- `isForbiddenError`;
- `isTokenExpiredError` and `tokenExpired`;
- `isInvalidTokenError`;
- `isValidationError`;
- `isRateLimitError`;
- `isServiceUnavailableError`; and
- `isRouteNotFoundError`.

Unknown errors return the same boolean fields as `false` and an empty `errors` array.

### `useDirectusAuth`

The auto-import is registered only when `auth.enabled` is `true`.

```ts
const auth = useDirectusAuth();
```

#### State

| Member                 | Type                                                 | Contract                       |
| ---------------------- | ---------------------------------------------------- | ------------------------------ |
| `auth._session`        | `DeepReadonly<Ref<DirectusSessionSnapshot \| null>>` | Read-only token-free snapshot. |
| `auth.isAuthenticated` | `DeepReadonly<ComputedRef<boolean>>`                 | `true` when a snapshot exists. |
| `auth.userId`          | `DeepReadonly<ComputedRef<string \| undefined>>`     | Current user ID.               |

The snapshot contains `userId` and optional `email`, `firstName`, and `lastName`. It does not
contain access tokens or refresh tokens. The current implementation intentionally keeps the public
snapshot identity-only; role, policy, and permission helpers are not part of this release.

#### Methods

| Method            | Signature                                                       | Behavior                                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`           | `login(input, meta?): Promise<void>`                            | Authenticates with Directus, fetches the selected current-user fields, writes the session cookie, updates Nuxt state, and emits `directus:auth:login`.                                                        |
| `refresh`         | `refresh(): Promise<void>`                                      | Requests a refresh, rotates the cookie token pair, updates state, and emits `directus:auth:refresh`. A failed refresh clears state and emits `directus:auth:invalidated` before rethrowing the request error. |
| `logout`          | `logout(): Promise<void>`                                       | Attempts upstream logout, always clears local state/cookie, and emits `directus:auth:logout`. An upstream failure is still rethrown after cleanup and emission.                                               |
| `passwordRequest` | `passwordRequest(email: string, meta?): Promise<void>`          | Requests a password-reset email using the configured `auth.passwordResetUrl`.                                                                                                                                 |
| `passwordReset`   | `passwordReset(token: string, password: string): Promise<void>` | Completes a Directus password reset.                                                                                                                                                                          |

The SSR server plugin reads the token-free snapshot directly from the `httpOnly` cookie into Nuxt
state. Hydration therefore does not require a session request. Server-side refresh coordination uses
Nitro storage. A shared, read-after-write consistent storage driver is required for coordination
across processes or Cloudflare isolates; the default in-memory driver is instance-local.

When `auth.enabled` is `false`, the module does not read, refresh, forward, or serialize Directus
session cookies. Static, preview, and unauthenticated access continue to work.

### Turnstile protection

Set `auth.turnstile.enabled: true` to register `@onderwijsin/nuxt-turnstile` and protect login plus
password-reset-email requests. Configure site and secret keys through the top-level `turnstile`
option. Follow the
[Turnstile module documentation](https://github.com/onderwijsin/nuxt-modules/tree/main/modules/turnstile)
to configure keys, render widgets, and manage tokens. Render each widget with the public action key
at `useRuntimeConfig().public.directus.auth.turnstile.actions.login` or `.passwordRequest`, then
pass the resulting token as `{ turnstileToken }` metadata to `auth.login` or `auth.passwordRequest`.
Tokens are single-use, so reset the widget after each processed submission.

## Authentication hooks

Register typed Nuxt app hooks with `useNuxtApp().hook`:

```ts
const nuxtApp = useNuxtApp();

nuxtApp.hook("directus:auth:login", (session) => {
  console.log("Signed in as", session.userId);
});
```

| Hook                        | Payload                         | Emission contract                                                     |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------- |
| `directus:auth:login`       | Read-only `DirectusAuthSession` | After the login cookie and reactive state are written.                |
| `directus:auth:refresh`     | Read-only `DirectusAuthSession` | After the refreshed cookie and reactive state are written.            |
| `directus:auth:logout`      | Previous `userId` or `null`     | After local state and cookie clearing, even if upstream logout fails. |
| `directus:auth:invalidated` | Previous `userId` or `null`     | After a failed/expired refresh clears local state.                    |

Hook payloads never contain token material. Hook failures are logged and do not reject, roll back,
or otherwise undo the completed authentication transition.

## Auto-imported SDK commands

The default auto-imports are `readItem` and `readItems`. The supported command names for
`directus.commands` are:

`aggregate`, `createComment`, `updateComment`, `deleteComment`, `createField`, `createItem`,
`createItems`, `deleteField`, `deleteFile`, `deleteFiles`, `readActivities`, `readActivity`,
`deleteItem`, `deleteItems`, `deleteUser`, `deleteUsers`, `importFile`, `readCollection`,
`readCollections`, `createCollection`, `updateCollection`, `deleteCollection`,
`readContentVersions`, `readContentVersion`, `readField`, `readFieldsByCollection`, `readFields`,
`readFile`, `readFiles`, `readItem`, `readItems`, `readSingleton`, `readMe`, `readPolicies`,
`readPolicy`, `createUser`, `createUsers`, `readUser`, `readUsers`, `updateField`, `updateFile`,
`updateFiles`, `updateFolder`, `updateFolders`, `updateItem`, `updateItems`, `updateSingleton`,
`updateMe`, `updateUser`, `updateUsers`, `uploadFiles`, `withSearch`, and `withOptions`.

Commands not configured for auto-import can be imported directly from `@directus/sdk`.

## Authentication routes

When `auth.enabled` is `true`, the module registers:

| Method | Route                              | Contract                                                             |
| ------ | ---------------------------------- | -------------------------------------------------------------------- |
| `POST` | `/_directus/auth/login`            | Validates email/password/optional OTP and returns the safe snapshot. |
| `POST` | `/_directus/auth/refresh`          | Refreshes the cookie session and returns the safe snapshot.          |
| `POST` | `/_directus/auth/logout`           | Attempts upstream logout, clears local state, and returns `204`.     |
| `GET`  | `/_directus/auth/session`          | Returns the persisted safe snapshot without contacting Directus.     |
| `POST` | `/_directus/auth/password-request` | Proxies the email and configured reset URL.                          |
| `POST` | `/_directus/auth/password-reset`   | Proxies the reset token and new password.                            |

All authentication mutations require an `Origin` or `Referer` matching the application origin.
Missing or cross-origin metadata is rejected with `403`, including when the session cookie uses
`sameSite: "none"`.

Directus MFA failures are recognized by `useDirectusError(error).isOtpError`.

## Generated schema types

Generated declarations are available through the virtual `#directus` module:

```ts
import type { Article } from "#directus";
```

Available opt-in augmentations are `removeEnums`, `replaceAnyWithUnknown`, `replaceJsonWithJSON`,
`applyTypeNameOverrides`, `makeNonNullableOptionalsRequired`, and `mergeJsDocs`. `typegen.rules`
overrides generated field types by collection and field. `typegen.transform` applies a final
build-time source transform.

## Proxy and security contract

- Browser REST calls use the same-origin `proxy.path`; browser code never receives the Directus URL
  or a server credential.
- The proxy removes incoming `Authorization`, `Cookie`, `Host`, `Origin`, connection, and hop-by-hop
  headers before forwarding.
- Credential precedence is preview token, current session (when `auth.enabled`), static token, then
  unauthenticated.
- Upstream `Set-Cookie` headers are not forwarded to the browser.
- Credentialed `POST`, `PUT`, `PATCH`, and `DELETE` proxy requests require an `Origin` or `Referer`
  matching the application origin. Missing and cross-origin metadata is rejected with `403`,
  including for `sameSite: "none"` cookies.
- Authentication `POST` routes apply the same origin validation before reading input or changing a
  session.
- Session cookies are `httpOnly`, `SameSite=Lax`, secure by default, bounded below the usual cookie
  size limit, and intentionally contain the server token pair plus a compact safe snapshot.
- Directus remains the final authorization boundary.
- The first release uses a plain, bounded, unsigned and unencrypted cookie; sealing and shared
  storage are future hardening options rather than current guarantees.

## Compatibility

Supported environments are Nuxt 4 and Node.js 22 or newer.
