# @onderwijsin/nuxt-directus-client

Typed, server-safe Directus REST access for Nuxt 4. Use it for browser and SSR requests, preview
lookups, generated schema types, normalized errors, and optional cookie-backed authentication.

## Install

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

`@onderwijsin/nuxt-directus-config` is optional. Without it, configure the same shape directly:

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

Direct module options and `directus.config.ts` use the same `instance` and `client` shape. When both
are present, direct module options take precedence. Keep `instance.baseUrl` and
`instance.staticToken` server-only. Never put Directus credentials in `runtimeConfig.public` or
browser code.

`instance.baseUrl` is optional. The module skips setup during `nuxt prepare` and CI when it is not
configured; any request made without it fails with a clear runtime error. Set
`directusClient.enabled: false` when an application does not configure Directus.

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

When importing the helper from reusable server-side module code, use the published server runtime
entrypoint:

```ts
import {
  useDirectusServer,
  useDirectusServerItemByPath
} from "@onderwijsin/nuxt-directus-client/runtime/server";
```

## Composables

All composables below are auto-imported. Import commands that are not configured in
`directusClient.client.commands` directly from `@directus/sdk`.

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

### `useDirectusServerAuth`

```ts
useDirectusServerAuth(event: H3Event): Promise<DirectusSessionSnapshot | null>
```

Reads the current token-free Directus session from a Nitro request. It refreshes an expiring or
expired access token while Directus still accepts the refresh token, and returns `null` when the
request is unauthenticated, the sealed session is invalid, refresh is rejected, or authentication is
disabled. Access and refresh tokens are never returned.

```ts
export default defineEventHandler(async (event) => {
  const session = await useDirectusServerAuth(event);

  if (!session) {
    throw createError({ statusCode: 401 });
  }

  return { userId: session.userId };
});
```

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

Normalizes Directus, SDK, `ofetch`, H3, and malformed errors. The result has `isDirectusError`,
`isNitroError`, a safe `errors` list, an optional `statusCode`, and flags for OTP, invalid
credentials, forbidden, expired or invalid tokens, validation, rate-limit, service-unavailable, and
route-not-found errors. Local authentication validation failures are marked with `isNitroError` and
expose `isInvalidAuthInput`, `isInvalidEmailInput`, `isInvalidPasswordInput`, `isInvalidOtpInput`,
`isInvalidPasswordResetTokenInput`, and `isInvalidMagicLinkTokenInput`. Their `errors` entries use
Nitro codes such as `INVALID_PASSWORD_INPUT` and preserve safe validation details including the
field, message, and maximum length. Unknown errors return both discriminator flags as `false` with
an empty `errors` list.

### `useDirectusAuth`

`useDirectusAuth` is available only when `client.auth.enabled` is true. Its full state and method
reference is in [Authentication](#authentication).

## Configuration

All options are configured under `directusClient`:

| Option                                | Default                             | Contract                                                                                              |
| ------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `enabled`                             | `true`                              | Enables the module.                                                                                   |
| `instance.baseUrl`                    | —                                   | Optional Directus URL. Required before requests can run.                                              |
| `instance.staticToken`                | —                                   | Optional server-only static credential.                                                               |
| `client.proxy.path`                   | `/_directus/proxy`                  | Absolute local same-origin browser proxy path. Root paths and auth-route collisions are rejected.     |
| `client.assets.enabled`               | `true`                              | Registers the dedicated Directus `/assets` proxy when enabled.                                        |
| `client.assets.path`                  | `/_directus/assets`                 | Absolute local asset-proxy path; uses the same safe local-path validation as `client.proxy.path`.     |
| `client.assets.publicOnly`            | `false`                             | Uses anonymous Directus asset requests only; session authentication is never attempted when enabled.  |
| `client.commands`                     | `[readItem, readItems]`             | SDK commands to auto-import. Unsupported names are rejected.                                          |
| `client.preview.enabled`              | `true`                              | Enables preview query parsing and request-scoped preview credentials.                                 |
| `client.preview.versioning`           | `true`                              | Enables versioned preview lookup.                                                                     |
| `client.preview.queryKeys`            | `preview`, `token`, `version`, `id` | Query parameter names used for preview context.                                                       |
| `client.auth.enabled`                 | `false`                             | Enables cookie authentication, authentication routes, and `useDirectusAuth`.                          |
| `client.auth.turnstile.enabled`       | `false`                             | Registers Turnstile and protects login plus password-reset-email requests.                            |
| `client.auth.magicLinks.enabled`      | `false`                             | Registers optional magic-link request and redemption routes; requires auth to be enabled.             |
| `client.auth.magicLinks.redirectUrl`  | —                                   | Fixed absolute callback URL sent upstream; required when enabled and server-only.                     |
| `client.auth.cookie.name`             | `directus_session`                  | Session cookie name.                                                                                  |
| `client.auth.cookie.secure`           | `true`                              | Sends the cookie only over HTTPS. Use `false` only for local HTTP development.                        |
| `client.auth.cookie.sameSite`         | `lax`                               | Cookie `SameSite` policy.                                                                             |
| `client.auth.cookie.path`             | `/`                                 | Cookie path.                                                                                          |
| `client.auth.cookie.maxAge`           | `2592000`                           | Cookie lifetime in seconds.                                                                           |
| `client.auth.cookie.domain`           | —                                   | Optional cookie domain.                                                                               |
| `client.auth.refreshSafetyWindow`     | `30000`                             | Refreshes a session this many milliseconds before expiry.                                             |
| `client.auth.refreshAttempts`         | `3`                                 | Total attempts for a refresh request, including the initial request.                                  |
| `client.auth.sessionSecret`           | —                                   | Server-only H3 sealing secret; required when auth is enabled and must contain at least 32 characters. |
| `client.auth.previousSessionSecrets`  | `[]`                                | Server-only previous sealing secrets tried during key rotation, in order.                             |
| `client.auth.maskSecretsInPlayground` | `true`                              | Masks tokens in the local sealed-session playground inspection page.                                  |
| `client.auth.passwordResetUrl`        | —                                   | Required for password-request support; sent to Directus as `reset_url`.                               |
| `client.typegen.enabled`              | `true`                              | Enables generated `#directus` declarations.                                                           |
| `client.typegen.introspectionToken`   | —                                   | Server-only Directus schema introspection token.                                                      |
| `client.typegen.cache.maxAge`         | `3600000`                           | Development type-generation cache lifetime in milliseconds.                                           |
| `client.typegen.augmentations`        | all `true`                          | Optional generated-output transforms.                                                                 |
| `client.typegen.rules`                | `{}`                                | Generated field type overrides keyed by collection and field.                                         |
| `client.typegen.transform`            | —                                   | Final build-time source transform.                                                                    |

The module validates options during Nuxt configuration. Production and CI type generation require
both `instance.baseUrl` and `client.typegen.introspectionToken` when it is enabled.

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
   `TOKENIZED_PREVIEW_TOKEN_KEY` as `token`, or set `client.preview.queryKeys.token` to match.

For example, an extension-backed URL can be configured as:

```ts
// Directus collection Preview URL (use Directus' dynamic-value picker for the placeholders)
/preview/https://app.example.test/pages/{{slug}}?preview=true&id={{id}}&version={{version}}
```

The default preview query keys are `preview`, `token`, `version`, and `id`; they can be renamed with
`client.preview.queryKeys`. Tokens stay request-scoped and are never exposed through public runtime
configuration. Set `client.preview.enabled` to `false` to ignore all preview parameters, or
`client.preview.versioning` to `false` to ignore only the version. This section covers credentialed
lookup, not the embedded editor; see [Live preview and framing](#live-preview-and-framing) for that
setup.

## Authentication

Enable authentication with `directusClient.client.auth.enabled: true`:

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

The session snapshot is persisted with the access and rotating refresh token in a bounded sealed
`httpOnly` cookie. SSR refreshes an expiring access token when possible before projecting the
snapshot into Nuxt state, so hydration does not require a session fetch. Access and refresh tokens
never enter client state or application code. H3 authenticated encryption protects the cookie's
confidentiality and integrity; Directus remains the authorization boundary.

Authentication calls made during SSR execute directly against the current server request. Browser
calls continue to use the same-origin `/_directus/auth/` endpoints.

When authentication is enabled, configure `client.auth.sessionSecret` from a cryptographically
random, server-only value of at least 32 characters. Existing unsigned cookies are rejected and
cleared. To rotate a secret without signing everyone out, put the old value in
`previousSessionSecrets`; new or read sessions are sealed with the active secret and old values are
removed after the migration overlap period. H3's derived session header is disabled for this module
(`sessionHeader: false`), so the Directus session is accepted only from the configured cookie.
Generate a session secret with:

```sh
openssl rand -base64 32
```

### `useDirectusAuth` API

The composable exposes a token-free, reactive session projection:

| State                    | Type                                                 | Contract                                                              |
| ------------------------ | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `auth._session`          | `DeepReadonly<Ref<DirectusSessionSnapshot \| null>>` | Read-only snapshot containing identity fields and `requiresTfaSetup`. |
| `auth.isAuthenticated`   | `DeepReadonly<ComputedRef<boolean>>`                 | `true` when a snapshot exists.                                        |
| `auth.userId`            | `DeepReadonly<ComputedRef<string \| undefined>>`     | Current user ID.                                                      |
| `auth.magicLinksEnabled` | `boolean`                                            | Whether the magic-link facade is enabled.                             |
| `auth.requiresTfaSetup`  | `DeepReadonly<ComputedRef<boolean>>`                 | Server-derived informational TFA setup requirement.                   |

The snapshot contains nullable `email`, `firstName`, and `lastName` fields plus `requiresTfaSetup`,
which reflects Directus' `enforce_tfa` claim. It deliberately contains no access or refresh token,
role, policy, or permission helpers. `requiresTfaSetup` is informational; the consuming application
owns any TFA setup UX or navigation.

| Method             | Signature                                                | Behavior                                                                                                                                                              |
| ------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login`            | `login({ email, password, otp? }, meta?): Promise<void>` | Authenticates, fetches the selected current-user fields, writes the session cookie, updates state, and emits `directus:auth:login`.                                   |
| `refresh`          | `refresh(): Promise<void>`                               | Refreshes and rotates the token pair, updates state, and emits `directus:auth:refresh`. On failure it clears state, emits `directus:auth:invalidated`, then rethrows. |
| `logout`           | `logout(): Promise<void>`                                | Attempts upstream logout, always clears local state and cookie, and emits `directus:auth:logout`. An upstream failure is rethrown after cleanup.                      |
| `passwordRequest`  | `passwordRequest(email, meta?): Promise<void>`           | Requests a password-reset email using `client.auth.passwordResetUrl`.                                                                                                 |
| `passwordReset`    | `passwordReset(token, password): Promise<void>`          | Completes a Directus password reset.                                                                                                                                  |
| `requestMagicLink` | `requestMagicLink(email, meta?): Promise<void>`          | Requests a passwordless login link when magic links are enabled.                                                                                                      |
| `redeemMagicLink`  | `redeemMagicLink(token, otp?): Promise<void>`            | Redeems a token, establishes the normal session, and emits `directus:auth:login`.                                                                                     |

`meta` may be `{ turnstileToken?: string }` when Turnstile protection is enabled.

### Magic links

Install the `directus-magic-links-bundle` extension in Directus, then enable magic links with a
fixed callback URL:

```ts
export default defineNuxtConfig({
  directusClient: {
    client: {
      auth: {
        enabled: true,
        magicLinks: {
          enabled: true,
          redirectUrl: "https://app.example.test/auth/magic-link"
        }
      }
    }
  }
});
```

Request and redeem links through the existing authentication facade:

```ts
const auth = useDirectusAuth();

await auth.requestMagicLink("user@example.test");
await auth.redeemMagicLink(token, otp);
```

The configured callback URL is fixed server configuration; the browser cannot override it. Directus
access and refresh tokens remain in the sealed HTTP-only session. `auth.requiresTfaSetup` exposes
the server-derived `enforce_tfa` state as informational data. The consuming application owns the
callback page, URL token extraction and cleanup, OTP UI, TFA setup navigation, return-to state, and
post-login navigation. When magic links are disabled, these facade methods perform no network
request.

Directus MFA failures are exposed through `useDirectusError(error).isOtpError`, allowing the UI to
ask for an OTP and retry `auth.login` or `auth.redeemMagicLink`. Local redemption token validation
uses `INVALID_MAGIC_LINK_TOKEN_INPUT` and `isInvalidMagicLinkTokenInput`.

When `client.auth.enabled` is `false`, Directus session cookies are ignored: they are not read,
refreshed, forwarded upstream, or added to the SSR payload. Static, preview, and unauthenticated
access remain available.

Authentication routes are registered under `/_directus/auth/`: `login`, `refresh`, `logout`,
`session`, `password-request`, and `password-reset`. SSR authentication bootstrap, the session
route, and authenticated Directus requests refresh when the access token enters the configured
safety window. They can also refresh an access token that has already expired; Directus decides
whether the refresh token is still valid. The refresh request uses `ofetch` retries, with
`refreshAttempts` defining the total number of attempts. Concurrent refreshes are coalesced through
Nitro storage. Cross-instance coordination requires a shared, read-after-write consistent Nitro
storage driver; the default in-memory driver cannot provide that guarantee, and deployment-level
refresh races remain possible otherwise. Refresh results written to that storage are H3-sealed
session values rather than plaintext token pairs; the configured Nitro storage backend must still be
treated as sensitive infrastructure.

When `client.auth.magicLinks.enabled` is true, the module additionally registers
`POST /_directus/auth/magic-links/request` and `POST /_directus/auth/magic-links/redeem`. These
routes require the Directus magic-links extension. The request route uses the fixed server-side
callback URL and redemption always requests Directus `mode: "json"`, establishing the normal sealed
session.

#### Rotating the session secret

Rotate `client.auth.sessionSecret` in two deployments: first set the new secret as active while
keeping the old secret in `client.auth.previousSessionSecrets`, then remove the old secret only
after all old cookies could have expired. Keep the overlap at least as long as
`client.auth.cookie.maxAge` plus a short deployment window so rolling instances can read and reseal
existing sessions. Removing a previous secret invalidates cookies still sealed with it. Keep the old
secret available during the overlap on every instance, and treat the shared Nitro storage mount as
sensitive while sealed refresh results from the previous deployment can remain within its short TTL.

The login and password-request routes accept emails up to 1024 characters. Login passwords and
password-reset passwords may be up to 512 characters, login OTPs up to 6 characters, and
password-reset tokens up to 1024 characters. Oversized values are rejected before they are forwarded
to Directus.

Authentication mutations require an `Origin` or `Referer` matching the application origin. Missing
or cross-origin metadata is rejected with `403`, including when the session cookie uses
`sameSite: "none"`.

The sealed-session inspection endpoint belongs only to the local playground and returns `404` in
production builds. Keep the playground out of production deployments and leave secret masking
enabled unless a local diagnostic explicitly requires otherwise.

### Turnstile protection

Set `client.auth.turnstile.enabled: true` to register `@onderwijsin/nuxt-turnstile` and require a
Turnstile token for login, password-reset-email, and magic-link request operations. Configure the
Turnstile site and secret keys through the usual top-level `turnstile` option. Follow the
[Turnstile module guide](../turnstile/README.md) to configure keys, render the widget, and manage
the token lifecycle. The Directus module exposes the required widget actions through public runtime
config, and the optional second argument to each auth method forwards the token in
`x-turnstile-token`:

```ts
const config = useRuntimeConfig();
const auth = useDirectusAuth();
const token = await getTokenWithRetry();

await auth.login({ email: "user@example.test", password: "password" }, { turnstileToken: token });

const passwordRequestAction = config.public.directusClient.auth.turnstile.actions.passwordRequest;
```

Use `config.public.directusClient.auth.turnstile.actions.login` for the login widget and
`passwordRequest` for the password-reset-request widget and `magicLinkRequest` for the magic-link
request widget. Cloudflare's test credentials return a verified test-key response without an action,
which the module recognizes only for those credentials. Tokens are required only when the option is
enabled; reset each widget after its submission because Turnstile tokens are single-use.

## Generated types

When type generation is enabled, the module uses
[directus-sdk-typegen](https://github.com/bryantgillespie/directus-sdk-typegen) to inspect your
Directus schema and expose collection interfaces plus `Schema` from the virtual `#directus` module:

```ts
import type { Article, Schema } from "#directus";
```

Configure it under `directusClient.client.typegen`:

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
- A local auth cookie normally needs `client.auth.cookie.secure: false` when the playground is
  served over plain HTTP. Keep the secure default in deployed environments.
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
- Supported environments are Nuxt 4 and Node.js 24 or newer. Node.js 22 may work but is untested and
  unsupported.
