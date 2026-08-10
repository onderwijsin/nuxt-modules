---
name: nuxt-directus
description:
  Use @onderwijsin/nuxt-directus for typed, server-safe Directus REST access, preview lookup, schema
  generation, error normalization, and optional cookie authentication in Nuxt 4.
---

# Nuxt Directus

@onderwijsin/nuxt-directus provides typed Directus SDK access for Nuxt 4. It supports browser and
SSR requests, Nitro server access, a same-origin proxy, preview-aware item lookup, generated schema
types, normalized errors, and optional cookie-backed authentication.

## Install and configure

    pnpm add @onderwijsin/nuxt-directus

    export default defineNuxtConfig({
      modules: ["@onderwijsin/nuxt-directus"],
      directus: {
        baseUrl: process.env.DIRECTUS_URL,
        staticToken: process.env.DIRECTUS_STATIC_TOKEN
      }
    });

Keep baseUrl, staticToken, and typegen.introspectionToken server-only. Do not put them in
runtimeConfig.public or browser code.

## Configuration reference

| Option                     | Default                     | Purpose                                     |
| -------------------------- | --------------------------- | ------------------------------------------- |
| enabled                    | true                        | Enables the module.                         |
| baseUrl                    | empty                       | Directus HTTP(S) base URL.                  |
| staticToken                | —                           | Server-only static credential.              |
| proxy.path                 | /_directus/proxy            | Same-origin browser proxy.                  |
| commands                   | readItem, readItems         | Auto-imported SDK commands.                 |
| preview.enabled            | true                        | Enables preview query parsing.              |
| preview.versioning         | true                        | Enables versioned preview lookup.           |
| preview.queryKeys          | preview, token, version, id | Preview query parameter names.              |
| auth.enabled               | false                       | Enables auth routes and useDirectusAuth.    |
| auth.cookie.name           | directus_session            | Session cookie name.                        |
| auth.cookie.secure         | true                        | HTTPS-only cookie flag.                     |
| auth.cookie.sameSite       | lax                         | Cookie SameSite policy.                     |
| auth.cookie.path           | /                           | Cookie path.                                |
| auth.cookie.maxAge         | 2592000                     | Cookie lifetime in seconds.                 |
| auth.cookie.domain         | —                           | Optional cookie domain.                     |
| auth.refreshSafetyWindow   | 30000                       | Early-refresh window in milliseconds.       |
| auth.passwordResetUrl      | —                           | Required for password reset requests.       |
| typegen.enabled            | true                        | Enables generated #directus declarations.   |
| typegen.introspectionToken | —                           | Server-only Directus schema token.          |
| typegen.cache.maxAge       | 3600000                     | Development cache lifetime in milliseconds. |
| typegen.augmentations      | all false                   | Optional generated-output transforms.       |
| typegen.rules              | empty object                | Generated field type overrides.             |
| typegen.transform          | —                           | Final build-time source transform.          |

The module validates option values and rejects unsafe proxy paths, unsupported SDK command names,
and incomplete production type-generation configuration.

## Public auto-imports

### useDirectus

Runs a typed REST command. Browser calls use the same-origin proxy; SSR calls use the direct server
client.

    const articles = await useDirectus(readItems("articles", { limit: 10 }));

### useDirectusServer

Runs a typed command directly from Nitro code. Pass the current event for request-scoped preview and
session credentials.

    export default defineEventHandler((event) =>
      useDirectusServer(readItems("articles", { limit: 10 }), event)
    );

### useDirectusItemByPath

Returns the first item matching a collection query, or null. Normal lookup uses readItems with
limit 1. A versioned preview requires both a preview token and item id, then uses readItem(id, {
version }).

### useDirectusServerItemByPath

Server equivalent of useDirectusItemByPath. Its signature is useDirectusServerItemByPath(event,
collection, query).

### useDirectusError

Normalizes Directus, SDK, ofetch, and H3 errors. It exposes error messages and these flags:

isOtpError, isInvalidCredentialError, isForbiddenError, isTokenExpiredError, isInvalidTokenError,
isValidationError, isRateLimitError, isServiceUnavailableError, isRouteNotFoundError,
invalidCredentials, and tokenExpired.

### useDirectusAuth

Registered when auth.enabled is true. The facade contains:

| Member                         | Type or behavior                                        |
| ------------------------------ | ------------------------------------------------------- |
| _session                       | Read-only session snapshot ref.                         |
| isAuthenticated                | Read-only computed boolean.                             |
| userId                         | Read-only computed user ID.                             |
| login(input)                   | Login with email, password, and optional otp.           |
| refresh()                      | Refresh an expiring session.                            |
| logout()                       | Revoke the upstream refresh token and clear the cookie. |
| passwordRequest(email)         | Request a password reset email.                         |
| passwordReset(token, password) | Complete a password reset.                              |

The SSR server plugin reads the token-free snapshot from the httpOnly cookie into Nuxt state, so the
client hydrates without a session fetch. Tokens never enter the client state. The snapshot contains
userId and optional email, firstName, and lastName only.

## Auto-imported SDK commands

The default commands are readItem and readItems. Supported command names are:

aggregate, createComment, updateComment, deleteComment, createField, createItem, createItems,
deleteField, deleteFile, deleteFiles, readActivities, readActivity, deleteItem, deleteItems,
deleteUser, deleteUsers, importFile, readCollection, readCollections, createCollection,
updateCollection, deleteCollection, readContentVersions, readContentVersion, readField,
readFieldsByCollection, readFields, readFile, readFiles, readItem, readItems, readSingleton, readMe,
readPolicies, readPolicy, createUser, createUsers, readUser, readUsers, updateField, updateFile,
updateFiles, updateFolder, updateFolders, updateItem, updateItems, updateSingleton, updateMe,
updateUser, updateUsers, uploadFiles, withSearch, and withOptions.

Import any supported command not configured for auto-import directly from @directus/sdk.

## Authentication routes

When auth.enabled is true:

- POST /_directus/auth/login
- POST /_directus/auth/refresh
- POST /_directus/auth/logout
- GET /_directus/auth/session
- POST /_directus/auth/password-request
- POST /_directus/auth/password-reset

Directus MFA login errors are reported as isOtpError. Use secure: false only for local HTTP
development; production sessions should use the default secure cookie.

## Generated schema types

Import generated declarations type-only:

    import type { Article } from "#directus";

Type generation requires baseUrl and typegen.introspectionToken. Available opt-in transforms are
removeEnums, replaceAnyWithUnknown, replaceJsonWithJSON, applyTypeNameOverrides,
makeNonNullableOptionalsRequired, and mergeJsDocs. Rules and transform run only during build.

## Credential and proxy boundaries

- Directus credentials and session tokens are server-only.
- Browser REST calls use the same-origin proxy at proxy.path.
- Caller-provided Authorization, cookie, host, origin, and connection headers are removed.
- Credential precedence is preview token, session token, static token, then unauthenticated.
- Directus remains the authorization boundary.

## Compatibility

Nuxt 4 and Node.js 22 or newer.
