---
name: nuxt-directus-client
description:
  Use @onderwijsin/nuxt-directus-client for typed server-safe Directus REST access, preview lookup,
  schema generation, normalized errors, and optional cookie authentication in Nuxt 4.
---

# Nuxt Directus Client

`@onderwijsin/nuxt-directus-client` provides typed Directus REST access across browser, SSR, and
Nitro code. It also provides a same-origin proxy, preview-aware item lookup, generated `#directus`
types, normalized Directus errors, and optional cookie-backed authentication.

## Installation and configuration

```sh
pnpm add @onderwijsin/nuxt-directus-client @onderwijsin/nuxt-directus-config
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-config", "@onderwijsin/nuxt-directus-client"]
});
```

```ts
// directus.config.ts
import { defineDirectusConfig } from "@onderwijsin/nuxt-directus-config/config";

export default defineDirectusConfig({
  instance: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN
  },
  client: {
    commands: ["readItem", "readItems"]
  }
});
```

`@onderwijsin/nuxt-directus-config` is optional. Direct module options use the same shape:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus-client"],
  directusClient: {
    instance: {
      baseUrl: process.env.DIRECTUS_URL,
      staticToken: process.env.DIRECTUS_STATIC_TOKEN
    },
    client: {
      commands: ["readItem", "readItems"]
    }
  }
});
```

When both sources are configured, direct module options take precedence. `instance.baseUrl`,
`instance.staticToken`, and `client.typegen.introspectionToken` are server-only. Do not place them
in `runtimeConfig.public` or browser code.

### Complete option reference

All options are configured under `directusClient`.

| Option                                | Default                             | Contract                                                                                              |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `enabled`                             | `true`                              | Enables the module.                                                                                   |
| `instance.baseUrl`                    | —                                   | Optional Directus URL. Required before requests can run.                                              |
| `instance.staticToken`                | —                                   | Optional server-only static credential.                                                               |
| `client.proxy.path`                   | `/_directus/proxy`                  | Absolute local same-origin browser proxy path. Root paths and auth-route collisions are rejected.     |
| `client.commands`                     | `[readItem, readItems]`             | SDK command names to auto-import. Unsupported names are rejected.                                     |
| `client.preview.enabled`              | `true`                              | Enables preview query parsing and request-scoped preview credentials.                                 |
| `client.preview.versioning`           | `true`                              | Enables versioned preview lookup.                                                                     |
| `client.preview.queryKeys`            | `preview`, `token`, `version`, `id` | Query parameter names used for preview context.                                                       |
| `client.auth.enabled`                 | `false`                             | Enables cookie authentication and registers authentication routes plus `useDirectusAuth`.             |
| `client.auth.turnstile.enabled`       | `false`                             | Registers Turnstile and protects login plus password-reset-email requests.                            |
| `client.auth.cookie.name`             | `directus_session`                  | Session cookie name.                                                                                  |
| `client.auth.cookie.secure`           | `true`                              | Sends the cookie only over HTTPS. Use `false` only for local HTTP development.                        |
| `client.auth.cookie.sameSite`         | `lax`                               | Cookie `SameSite` policy.                                                                             |
| `client.auth.cookie.path`             | `/`                                 | Cookie path.                                                                                          |
| `client.auth.cookie.maxAge`           | `2592000`                           | Cookie lifetime in seconds.                                                                           |
| `client.auth.cookie.domain`           | —                                   | Optional cookie domain.                                                                               |
| `client.auth.refreshSafetyWindow`     | `30000`                             | Refreshes a session this many milliseconds before expiry.                                             |
| `client.auth.sessionSecret`           | —                                   | Server-only H3 sealing secret; required when auth is enabled and must contain at least 32 characters. |
| `client.auth.previousSessionSecrets`  | `[]`                                | Server-only previous sealing secrets tried during key rotation, in order.                             |
| `client.auth.maskSecretsInPlayground` | `true`                              | Masks tokens in the local sealed-session playground inspection page.                                  |
| `client.auth.passwordResetUrl`        | —                                   | Required for password-request support; sent as Directus `reset_url`.                                  |
| `client.typegen.enabled`              | `true`                              | Enables generated `#directus` declarations.                                                           |
| `client.typegen.introspectionToken`   | —                                   | Server-only Directus schema introspection token.                                                      |
| `client.typegen.cache.maxAge`         | `3600000`                           | Development type-generation cache lifetime in milliseconds.                                           |
| `client.typegen.augmentations`        | all `true`                          | Optional generated-output transforms.                                                                 |
| `client.typegen.rules`                | `{}`                                | Generated field type overrides keyed by collection and field.                                         |
| `client.typegen.transform`            | —                                   | Final build-time source transform.                                                                    |

The module validates option values during Nuxt configuration. `instance.baseUrl` is optional, but
requests cannot run without it; the module skips setup during `nuxt prepare` and CI when it is
absent. Set `enabled: false` when Directus is not configured. Production type generation
additionally requires `client.typegen.introspectionToken`.

## Public auto-imports

### `useDirectus`

```ts
useDirectus<Output>(command: RestCommand<Output, Schema>): Promise<Output>
```

Executes a typed Directus REST command. Browser calls use the same-origin proxy; SSR calls use the
direct server client. The module chooses preview, session (only with `client.auth.enabled`), static,
or no credential on the server. Callers cannot override that credential with request headers.

### `useDirectusServer`

```ts
useDirectusServer<Output>(
  command: RestCommand<Output, Schema>,
  event?: H3Event
): Promise<Output>
```

Executes a typed command directly from Nitro. Passing the current `H3Event` enables request-scoped
preview and, when enabled, session credential resolution.

For reusable server-side module code, import it from the published runtime entrypoint:

```ts
import {
  useDirectusServer,
  useDirectusServerItemByPath
} from "@onderwijsin/nuxt-directus-client/runtime/server";
```

### `useDirectusItemByPath`

```ts
useDirectusItemByPath(collection, query): Promise<Item | null>
```

Queries a collection and returns its first matching item or `null`. Normal path lookup uses
`readItems` with `limit: 1`. When the request contains a valid version-preview context, it uses the
preview URL's item ID with `readItem(id, { version })` instead.

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
- `isNitroError` for Nitro/H3 validation errors generated by the module;
- `errors`, containing safe `message`, `code`, and `extensions` values;
- optional `statusCode`;
- `isOtpError`;
- `isInvalidCredentialError`;
- `isForbiddenError`;
- `isTokenExpiredError`;
- `isInvalidTokenError`;
- `isValidationError`;
- `isRateLimitError`;
- `isServiceUnavailableError`; and
- `isRouteNotFoundError`.

Local authentication validation failures also expose `isInvalidAuthInput`, `isInvalidEmailInput`,
`isInvalidPasswordInput`, `isInvalidOtpInput`, and `isInvalidPasswordResetTokenInput`. Their
`errors` entries use Nitro codes such as `INVALID_PASSWORD_INPUT` and include safe field, message,
and constraint details. Directus errors retain their upstream codes; Nitro codes are not added to
Directus error envelopes.

Unknown errors return both discriminator flags as `false` and an empty `errors` array.

### `useDirectusAuth`

The auto-import is registered only when `client.auth.enabled` is `true`.

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
| `passwordRequest` | `passwordRequest(email: string, meta?): Promise<void>`          | Requests a password-reset email using the configured `client.auth.passwordResetUrl`.                                                                                                                          |
| `passwordReset`   | `passwordReset(token: string, password: string): Promise<void>` | Completes a Directus password reset.                                                                                                                                                                          |

The SSR server plugin reads the token-free snapshot directly from the `httpOnly` cookie into Nuxt
state. Hydration therefore does not require a session request. Server-side refresh coordination uses
Nitro storage. A shared, read-after-write consistent storage driver is required for coordination
across processes or Cloudflare isolates; the default in-memory driver is instance-local.

When `client.auth.enabled` is `false`, the module does not read, refresh, forward, or serialize
Directus session cookies. Static, preview, and unauthenticated access continue to work.

### Turnstile protection

Set `client.auth.turnstile.enabled: true` to register `@onderwijsin/nuxt-turnstile` and protect
login plus password-reset-email requests. Configure site and secret keys through the top-level
`turnstile` option. Follow the
[Turnstile module documentation](https://github.com/onderwijsin/nuxt-modules/tree/main/modules/turnstile)
to configure keys, render widgets, and manage tokens. Render each widget with the public action key
at `useRuntimeConfig().public.directusClient.auth.turnstile.actions.login` or `.passwordRequest`,
then pass the resulting token as `{ turnstileToken }` metadata to `auth.login` or
`auth.passwordRequest`. Cloudflare's test credentials return a verified test-key response without an
action, which the module recognizes only for those credentials. Tokens are single-use, so reset the
widget after each processed submission.

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

## Version previews

Directus Content Versions are unpublished changes to a main item. When a preview URL contains
`preview=true`, an item `id`, and a version key, `useDirectusItemByPath` and
`useDirectusServerItemByPath` read that item with `readItem(id, { version })`. Without a valid
version context they retain their normal query-and-first-item behavior.

Set up Directus for version previews:

1. In **Settings → Data Model**, enable **Content Versioning** for each collection and create
   versions in the item editor.
2. Set the collection's Preview URL to the corresponding application route. Use Directus' dynamic
   value picker to include item **ID** and **Version**, for example:
   `https://app.example.test/pages/{{slug}}?preview=true&id={{id}}&version={{version}}`.
3. For unpublished content, give the preview request a short-lived credential. The recommended
   [Tokenized Preview Endpoint](https://github.com/formfcw/directus-extension-tokenized-preview)
   adds one: install it in Directus, configure its preview base URL, and prefix the collection URL
   with `/preview/`. It appends `token`; if configured with another token key, set
   `client.preview.queryKeys.token` to match.

Preview tokens are request-scoped and never enter public runtime config. The default query keys are
`preview`, `token`, `version`, and `id`; rename them with `client.preview.queryKeys`. Set
`client.preview.enabled: false` to ignore all preview parameters, or
`client.preview.versioning: false` to ignore only the version. Version previews do not configure
Directus' embedded editor; see the Directus
[Live Preview guide](https://docs.directus.io/guides/headless-cms/live-preview/nuxt-3) for framing
and refresh behavior.

## Auto-imported SDK commands

The default auto-imports are `readItem` and `readItems`. The supported command names for
`directusClient.client.commands` are:

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

When `client.auth.enabled` is `true`, the module registers:

| Method | Route                              | Contract                                                                                             |
| ------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `POST` | `/_directus/auth/login`            | Validates email (max 1024), password (max 512), optional OTP (max 6), and returns the safe snapshot. |
| `POST` | `/_directus/auth/refresh`          | Refreshes the cookie session and returns the safe snapshot.                                          |
| `POST` | `/_directus/auth/logout`           | Attempts upstream logout, clears local state, and returns `204`.                                     |
| `GET`  | `/_directus/auth/session`          | Returns the persisted safe snapshot without contacting Directus.                                     |
| `POST` | `/_directus/auth/password-request` | Validates email (max 1024), then proxies it with the configured reset URL.                           |
| `POST` | `/_directus/auth/password-reset`   | Validates the reset token (max 1024) and new password (max 512), then proxies them.                  |

All authentication mutations require an `Origin` or `Referer` matching the application origin.
Missing or cross-origin metadata is rejected with `403`, including when the session cookie uses
`sameSite: "none"`.

Directus MFA failures are recognized by `useDirectusError(error).isOtpError`.

## Generated schema types

Generated declarations are available through the virtual `#directus` module:

```ts
import type { Article } from "#directus";
```

The module uses [directus-sdk-typegen](https://github.com/bryantgillespie/directus-sdk-typegen) to
generate collection interfaces and `Schema`. Configure it under `directusClient.client.typegen`:

| Option               | Contract                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`            | Set `false` to skip generation; an existing declaration is reused when available, otherwise `Schema` is empty.                       |
| `introspectionToken` | Server-only schema-introspection token. Required for enabled generation outside local development.                                   |
| `cache.maxAge`       | Development-only cache lifetime in milliseconds. CI and production always regenerate.                                                |
| `augmentations`      | Individually disable output transforms; every flag defaults to `true`.                                                               |
| `rules`              | Replace a generated field type by collection and field, for example `{ articles: { body: "RichText" } }`.                            |
| `transform`          | Final build-time source transform; receives source plus URL, generator version, collections, and rules, and must return source text. |

| Augmentation                       | Effect                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `removeEnums`                      | Removes generated `export enum` declarations.                                  |
| `replaceAnyWithUnknown`            | Rewrites generated `Record<…, any>` values to `Record<…, unknown>`.            |
| `replaceJsonWithJSON`              | Rewrites quoted `"json"` field types to `JSON`.                                |
| `applyTypeNameOverrides`           | Applies the module's reviewed generated type-name corrections.                 |
| `makeNonNullableOptionalsRequired` | Makes simple optional fields required when their type does not include `null`. |
| `mergeJsDocs`                      | Merges adjacent generated JSDoc tag blocks and removes duplicate tags.         |

They run in the shown order before `rules`, then `transform`. Incomplete credentials reuse the prior
declaration or an empty `Schema` only during local development. CI and production fail when enabled
generation lacks credentials.

## Proxy and security contract

The browser endpoint at `proxy.path` (default `/_directus/proxy`) forwards Directus REST calls. It
preserves method, body, query, response status, and safe response headers, while browser code never
receives the Directus URL or a server credential.

- The proxy removes incoming `Authorization`, `Cookie`, `Host`, `Origin`, connection, and hop-by-hop
  headers before forwarding.
- Credential precedence is preview token, current session (when `client.auth.enabled`), static
  token, then unauthenticated.
- Upstream `Set-Cookie` headers are not forwarded to the browser.
- Credentialed `POST`, `PUT`, `PATCH`, and `DELETE` proxy requests require an `Origin` or `Referer`
  matching the application origin. Missing and cross-origin metadata is rejected with `403`,
  including for `sameSite: "none"` cookies.
- Authentication `POST` routes apply the same origin validation before reading input or changing a
  session.
- Session cookies are `httpOnly`, `SameSite=Lax`, secure by default, bounded below the usual cookie
  size limit, and intentionally contain the server token pair plus a compact safe snapshot.
- Directus remains the final authorization boundary.
- Sessions use a bounded H3-sealed cookie. Configure a cryptographically random server-only
  `client.auth.sessionSecret` of at least 32 characters. Existing unsigned cookies are rejected; use
  `previousSessionSecrets` for staged key rotation. The module disables H3's derived session header
  and accepts authentication only from the configured cookie.

Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

The proxy is not a general-purpose proxy, CORS bypass, session-token API, or authorization layer. It
can only target the configured Directus URL; authorization still happens in Directus.

## Compatibility

Supported environments are Nuxt 4 and Node.js 22 or newer.
