# @onderwijsin/nuxt-directus

Typed, server-safe Directus REST access for Nuxt 4 applications. The module provides:

- typed Directus SDK command access in browser, SSR, and Nitro code;
- a same-origin proxy for browser requests;
- preview-aware item lookup, including versioned content;
- generated #directus schema types;
- normalized Directus error inspection; and
- optional cookie-backed authentication with SSR-safe session state.

## Installation

    pnpm add @onderwijsin/nuxt-directus

    // nuxt.config.ts
    export default defineNuxtConfig({
      modules: ["@onderwijsin/nuxt-directus"],
      directus: {
        baseUrl: process.env.DIRECTUS_URL,
        staticToken: process.env.DIRECTUS_STATIC_TOKEN
      }
    });

baseUrl and staticToken are server-only configuration. Never place Directus credentials in
runtimeConfig.public or browser code.

## Configuration

All options are available under directus.

| Option                     | Default                     | Description                                                      |
| -------------------------- | --------------------------- | ---------------------------------------------------------------- |
| enabled                    | true                        | Enables the module.                                              |
| baseUrl                    | empty                       | Directus URL. Must use http or https.                            |
| staticToken                | —                           | Optional server-only token for static/server access.             |
| proxy.path                 | /_directus/proxy            | Same-origin browser proxy path.                                  |
| commands                   | readItem, readItems         | SDK commands to auto-import.                                     |
| preview.enabled            | true                        | Enables preview query handling.                                  |
| preview.versioning         | true                        | Enables versioned preview lookup.                                |
| preview.queryKeys          | preview, token, version, id | Query parameter names used by preview lookup.                    |
| auth.enabled               | false                       | Enables cookie-backed authentication routes and useDirectusAuth. |
| auth.cookie.name           | directus_session            | Session cookie name.                                             |
| auth.cookie.secure         | true                        | Sends the cookie only over HTTPS.                                |
| auth.cookie.sameSite       | lax                         | Cookie SameSite policy.                                          |
| auth.cookie.path           | /                           | Cookie path.                                                     |
| auth.cookie.maxAge         | 2592000                     | Cookie lifetime in seconds.                                      |
| auth.cookie.domain         | —                           | Optional cookie domain.                                          |
| auth.refreshSafetyWindow   | 30000                       | Refreshes sessions this many milliseconds before expiry.         |
| auth.passwordResetUrl      | —                           | Required when using password reset requests.                     |
| typegen.enabled            | true                        | Enables generated Directus schema types.                         |
| typegen.introspectionToken | —                           | Server-only token used for schema introspection.                 |
| typegen.cache.maxAge       | 3600000                     | Development type-generation cache lifetime in milliseconds.      |
| typegen.augmentations      | all false                   | Optional output transformations.                                 |
| typegen.rules              | empty object                | Field type overrides keyed by collection and field.              |
| typegen.transform          | —                           | Final build-time source transform.                               |

Example:

    export default defineNuxtConfig({
      modules: ["@onderwijsin/nuxt-directus"],
      directus: {
        baseUrl: process.env.DIRECTUS_URL,
        staticToken: process.env.DIRECTUS_STATIC_TOKEN,
        proxy: { path: "/api/directus" },
        commands: ["readItems", "readItem", "readSingleton"],
        preview: { enabled: true, versioning: true },
        auth: {
          enabled: true,
          cookie: { secure: process.env.NODE_ENV === "production" },
          passwordResetUrl: "https://app.example.test/reset-password"
        },
        typegen: {
          introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN
        }
      }
    });

Invalid option values, unsafe proxy paths, unsupported commands, and incomplete production
type-generation credentials fail during configuration validation.

## REST API

### useDirectus

Runs a typed Directus REST command:

    const articles = await useDirectus(readItems("articles", { limit: 10 }));
    const article = await useDirectus(readItem("articles", "article-id"));

Browser requests use the same-origin proxy. During SSR, requests go directly to Directus. The module
selects the upstream credential; callers cannot override it with request headers.

### useDirectusServer

Runs the same typed command directly from Nitro code:

    export default defineEventHandler((event) =>
      useDirectusServer(readItems("articles", { limit: 10 }), event)
    );

The optional event enables request-scoped preview and session credential resolution.

### Auto-imported SDK commands

The default auto-imports are readItem and readItems. Supported values for directus.commands are:

aggregate, createComment, updateComment, deleteComment, createField, createItem, createItems,
deleteField, deleteFile, deleteFiles, readActivities, readActivity, deleteItem, deleteItems,
deleteUser, deleteUsers, importFile, readCollection, readCollections, createCollection,
updateCollection, deleteCollection, readContentVersions, readContentVersion, readField,
readFieldsByCollection, readFields, readFile, readFiles, readItem, readItems, readSingleton, readMe,
readPolicies, readPolicy, createUser, createUsers, readUser, readUsers, updateField, updateFile,
updateFiles, updateFolder, updateFolders, updateItem, updateItems, updateSingleton, updateMe,
updateUser, updateUsers, uploadFiles, withSearch, and withOptions.

Commands not listed in directus.commands can be imported directly from @directus/sdk.

## Preview-aware item lookup

useDirectusItemByPath(collection, query) and useDirectusServerItemByPath(event, collection, query)
return the first matching item or null.

Normal lookup uses readItems with limit 1. Preview requires a request-scoped token. Versioned
preview also requires the item id and uses readItem(id, { version }). The main version is treated as
the normal item.

    const page = await useDirectusItemByPath("pages", {
      filter: { slug: { _eq: "home" } },
      fields: ["id", "title"]
    });

Preview tokens are request-scoped and are never exposed through public runtime configuration.

## Authentication

Enable authentication with directus.auth.enabled: true. The module registers:

- POST /_directus/auth/login
- POST /_directus/auth/refresh
- POST /_directus/auth/logout
- GET /_directus/auth/session
- POST /_directus/auth/password-request
- POST /_directus/auth/password-reset

Use the auto-imported useDirectusAuth facade:

    const auth = useDirectusAuth();

    await auth.login({
      email: "user@example.test",
      password: "password",
      otp: "123456"
    });

    if (auth.isAuthenticated.value) {
      console.log(auth.userId.value);
    }

    await auth.refresh();
    await auth.logout();

The facade exposes:

| Member                         | Description                                       |
| ------------------------------ | ------------------------------------------------- |
| _session                       | Read-only Ref of DirectusSessionSnapshot or null. |
| isAuthenticated                | Read-only computed authentication state.          |
| userId                         | Read-only computed user ID.                       |
| login(input)                   | Logs in with email, password, and optional OTP.   |
| refresh()                      | Refreshes an expiring Directus session.           |
| logout()                       | Logs out upstream and clears the local cookie.    |
| passwordRequest(email)         | Requests a password reset email.                  |
| passwordReset(token, password) | Completes a password reset.                       |

The session snapshot contains only userId, email, firstName, and lastName when returned by Directus.
Roles, policies, and permissions are not included.

The session cookie contains the server-only token pair and compact snapshot. During SSR, the server
plugin reads the snapshot directly from the cookie into Nuxt state; no session lookup request is
required for hydration. Refresh coordination uses Nitro storage so concurrent requests can share one
rotated token result.

The default cookie is httpOnly, SameSite=Lax, path /, and secure. Use secure: false only for local
HTTP development.

## Error handling

useDirectusError(error) safely normalizes Directus, ofetch, SDK, and H3 error envelopes:

    try {
      await auth.login({ email, password });
    } catch (error) {
      const directusError = useDirectusError(error);
      if (directusError.isOtpError) {
        // Ask the user for an MFA code.
      }
    }

It exposes normalized messages and flags including isOtpError, isInvalidCredentialError,
isForbiddenError, isTokenExpiredError, isInvalidTokenError, isValidationError, isRateLimitError,
isServiceUnavailableError, and isRouteNotFoundError.

## Generated schema types

When type generation is configured, import generated types from #directus:

    import type { Article } from "#directus";

Use type-only imports. Type generation runs during Nuxt preparation/build and requires both baseUrl
and typegen.introspectionToken outside the empty-schema fallback.

Available opt-in augmentations are removeEnums, replaceAnyWithUnknown, replaceJsonWithJSON,
applyTypeNameOverrides, makeNonNullableOptionalsRequired, and mergeJsDocs. Rules and the final
transform apply at build time only.

## Security boundaries

- Directus URLs, static tokens, introspection tokens, and session tokens are server-only.
- Browser requests use the same-origin proxy.
- Incoming browser Authorization, cookies, host, origin, and connection headers are removed before
  proxy forwarding.
- The proxy chooses preview, session, static, or no credentials in that order.
- The session snapshot is token-free and contains no roles or policies.
- Directus remains the final authorization boundary.

## Compatibility

Nuxt 4 and Node.js 22 or newer are supported.
