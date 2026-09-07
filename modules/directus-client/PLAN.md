Rework `feat/directus-user` by stripping the current-user feature back to a small, obvious
implementation.

The branch has become over-engineered around the requirements in #314. We do **not** need to
preserve all of those architectural requirements.

The actual feature we want is simple:

> Fetch the authenticated Directus user with configured fields, optionally map the result
> server-side, expose it through `useDirectusUser()`, allow manual refresh, and synchronize it with
> login/logout/invalidation.

Keep **field configuration** and **mapper support**.

Everything else should justify its existence.

# Desired consumer API

Configuration:

```ts
export default defineDirectusConfig({
  client: {
    auth: {
      enabled: true,

      user: {
        enabled: true,

        fields: [
          "id",
          "email",
          "first_name",
          {
            role: ["id", "name"]
          }
        ],

        mapper(user) {
          return {
            id: user.id,
            email: user.email,
            name: user.first_name,
            role: user.role
          };
        }
      }
    }
  }
});
```

Usage:

```ts
const { user, status, error, refresh } = useDirectusUser();
```

Lifecycle:

```text
authenticated initial render
→ fetch user

logged out initial render
→ user = null
→ no request

login
→ refresh current user if composable exists

logout
→ clear current user

auth invalidation
→ clear current user

auth token refresh
→ do nothing

profile changed by consumer
→ consumer calls refresh()
```

That is the feature.

---

# 1. Keep `fields`

Keep:

```ts
auth: {
  user: {
    enabled: true,
    fields: [...]
  }
}
```

`fields` should remain:

- required when user fetching is enabled;
- non-empty;
- compatible with Directus nested field selection.

Do not call this a "projection" throughout the implementation.

These are simply:

```text
user fields
```

Use straightforward names.

---

# 2. Keep `mapper`

Keep:

```ts
mapper(user) {
  return ...
}
```

The mapper remains:

- optional;
- synchronous;
- server-side only;
- available only through executable `directus.config.ts`;
- applied after fetching the Directus user.

The route should essentially do:

```text
readMe({ fields })
    ↓
mapper exists?
    ↓
yes → mapper(user)
no  → user
    ↓
return
```

Do not build infrastructure around mapper typing in this pass.

If TypeScript cannot infer the mapper's exact return type in `useDirectusUser()`, that is acceptable
for now.

We will inspect the resulting simple implementation first and decide later whether stronger typing
is worth additional machinery.

---

# 3. Delete all current-user-specific strict type generation

Remove:

```text
#directus-user
DirectusUserProjection
generateDirectusUserTypeDeclaration
user field → TypeScript source generation
mapper return-type extraction
consumer-specific user declaration generation
user type templates
user type aliases in Nuxt tsconfig
compile fixtures that only exercise this custom typegen
```

Do not replace these with:

- module augmentation;
- generated generic facades;
- declaration registries;
- another virtual type module.

Use a reasonable broad type based on what the Directus SDK naturally gives us.

First inspect the SDK's normal `readMe()` return type and use the simplest useful existing type.

Mapper output may temporarily widen that type.

That is fine.

Correct runtime behavior and clean architecture matter more than perfect typing in this pass.

---

# 4. Do not use `#directus-config-server`

Current-user support must have **no dependency** on:

```text
#directus-config-server
```

Remove any current-user-specific:

```text
#directus-config-server imports
fallback aliases
empty-config.ts
config declaration stubs
mapperEnabled runtime config
```

Do not replace it with another `#directus-user-*` alias.

---

# 5. Keep mapper executable without a source alias

The mapper cannot go into `runtimeConfig` because it is executable code.

Solve that in the smallest possible way.

## Preferred approach: generate the server handler

During module setup we already know:

- whether the effective user configuration came from executable `directus.config.ts`;
- the path to that config file;
- whether a mapper is configured.

Use that information to generate the `/_directus/auth/user` server handler.

For example, when a mapper exists, the generated handler can conceptually be:

```ts
import directusConfig from "/absolute/path/to/directus.config.ts";
import { createDirectusUserHandler } from "<package runtime helper>";

const userConfig = directusConfig.client?.auth?.user;

export default createDirectusUserHandler(userConfig?.enabled ? userConfig.mapper : undefined);
```

When there is no mapper:

```ts
import { createDirectusUserHandler } from "<package runtime helper>";

export default createDirectusUserHandler();
```

The exact implementation may differ.

The important properties are:

- no source alias;
- no empty config stub;
- no executable function in runtime config;
- no `mapperEnabled`;
- no generic server-config virtual module;
- no mapper type-generation machinery.

The generated file is simply the concrete Nitro handler for this configured application.

Keep the generated source tiny.

---

# 6. Keep field configuration in private runtime config

The serializable part belongs in normal private runtime config:

```ts
directusClient: {
  auth: {
    user: {
      enabled: true,
      fields: [...]
    }
  }
}
```

The route/helper can therefore read:

```ts
const { fields } = useRuntimeConfig(event).directusClient.auth.user;
```

No custom config source import is needed for fields.

The executable config source is only needed to obtain the optional mapper.

---

# 7. Simplify user config resolution

Do not retain concepts such as:

```text
effectiveUserProjection
userProjection
projection source metadata
mapperEnabled
```

We only need to answer:

1. is current-user fetching enabled?
2. what fields should it fetch?
3. is there a server mapper?
4. if so, where does it come from?

Use a small setup helper if useful:

```ts
resolveDirectusUserConfig(...)
```

A return shape could be approximately:

```ts
{
  config: resolvedUserConfig,
  mapperConfigFile?: string
}
```

Do not turn source origin into a domain abstraction unless actually needed.

Atomic raw-vs-shared semantics may remain if necessary:

```text
raw auth.user exists
→ raw subtree wins

otherwise shared auth.user
→ shared subtree wins
```

But implement that once and keep it boring.

---

# 8. Use one HTTP route in browser and SSR

Keep:

```text
GET /_directus/auth/user
```

as the canonical current-user boundary.

Both browser and SSR use it.

Do not:

- inject `$directusUser`;
- create separate browser/SSR fetch implementations;
- import Nitro current-user implementation into Nuxt App runtime.

`useDirectusUser()` should fetch the route itself.

---

# 9. Keep `useDirectusUser()` tiny

Target something close to:

```ts
export function useDirectusUser() {
  const auth = useDirectusAuth();
  const requestFetch = useRequestFetch();

  const { data, status, error, refresh } = useAsyncData(
    "directus:user",
    () => requestFetch("/_directus/auth/user"),
    {
      default: () => null,
      immediate: auth.isAuthenticated.value
    }
  );

  return {
    user: data,
    status,
    error,
    refresh
  };
}
```

There may need to be a tiny fetch helper for SSR cookie propagation.

Do not add anything else unless required.

---

# 10. Preserve SSR session-cookie rotation

There is one non-obvious requirement we genuinely need.

During SSR:

```text
useDirectusUser()
→ internal /_directus/auth/user request
→ auth resolver may refresh Directus tokens
→ session cookie may rotate
```

The inner response's `Set-Cookie` must propagate to the outer SSR response.

`useRequestFetch()` forwards incoming cookies but does not automatically propagate response cookies.

Therefore use `requestFetch.raw()` or equivalent and copy `Set-Cookie` headers onto the outer event
when running server-side.

Implement this in one small helper.

For example:

```text
runtime/user/app/fetch-user.ts
```

Do not turn it into a transport abstraction or plugin.

---

# 11. Remove the current-user SSR plugin

Delete the SSR plugin added by this feature.

Remove:

```text
user/app/ssr-plugin.ts
$directusUser injection
direct resolveDirectusUser(event) call from Nuxt App
NuxtApp current-user augmentation
```

There should only be one network/API path.

---

# 12. Keep one tiny client lifecycle plugin

Keep a client plugin only for auth lifecycle synchronization:

```ts
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook("directus:auth:login", () => {
    refreshNuxtData("directus:user");
  });

  nuxtApp.hook("directus:auth:logout", () => {
    clearNuxtData("directus:user");
  });

  nuxtApp.hook("directus:auth:invalidated", () => {
    clearNuxtData("directus:user");
  });
});
```

Do nothing for:

```text
directus:auth:refresh
```

No custom user state.

No custom request coordination.

No inspection of Nuxt's private async-data registry.

---

# 13. Make the server implementation equally boring

Create one small server helper/handler factory if needed for injecting the mapper.

For example:

```ts
export function createDirectusUserHandler(mapper?: (user: DirectusUser) => unknown) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, "cache-control", "private, no-store");

    const auth = await event.context.directusAuth?.resolve();

    if (!auth?.accessToken) {
      throw createError({
        statusCode: 401
      });
    }

    const config = useRuntimeConfig(event);

    const fields = config.directusClient.auth.user.fields;

    const client = createDirectusRestClient({
      baseUrl: config.directusClient.baseUrl,
      accessToken: auth.accessToken,
      fetch: ofetch
    });

    const user = await client.request(readMe({ fields }));

    return mapper ? mapper(user) : user;
  });
}
```

Illustrative only.

The final code should prioritize straightforwardness over matching this exact structure.

---

# 14. Keep exact session credential semantics

Do **not** switch this route to normal `useDirectusServer()` credential resolution.

Current-user fetching must use:

```ts
auth.accessToken;
```

from:

```ts
event.context.directusAuth.resolve();
```

directly.

Preview/proxy credentials must not replace it.

A dedicated request-local Directus client is acceptable and simple.

---

# 15. Remove unnecessary validation layers

We already validate module config with Zod.

Do not then write:

```ts
isRecord(...)
hasKey(...)
isBoolean(...)
isArray(...)
```

around every runtime config access.

Trust our own resolved config.

Likewise, do not validate the Directus user response into some invented "projection" shape solely
because #314 asked for it.

Directus SDK/request errors can behave normally.

If mapper errors, let the mapper error propagate.

If we later discover a concrete unsafe boundary, validate that specific boundary then.

---

# 16. Keep the auth snapshot simplification

Keep the already useful auth-state cleanup:

```ts
{
  (userId, requiresTfaSetup);
}
```

Do not put profile fields back into the auth session.

Login may fetch only:

```text
id
```

Token refresh should preserve `userId` without fetching `/users/me`.

The separate current-user fetch is still the correct conceptual boundary.

---

# 17. Remove "projection" terminology

Unless technically unavoidable, remove names containing:

```text
Projection
projection
```

This feature is not a projection framework.

Use:

```text
Directus user
user config
user fields
user mapper
current user
```

---

# 18. Tests should prove behavior, not machinery

Remove tests for deleted architecture/typegen.

Retain/add focused tests for:

## Configuration

- user disabled by default;
- enabled user requires auth;
- enabled user requires non-empty fields;
- nested fields are accepted;
- mapper accepted through executable shared config;
- mapper rejected where executable functions are not allowed;
- raw user config overrides shared user config atomically if that behavior remains required.

## Server

- unauthenticated → 401;
- uses configured fields;
- nested fields reach Directus;
- exact session token is used;
- preview/proxy credentials do not override it;
- mapper receives fetched user;
- mapper result is returned;
- mapper error propagates;
- no mapper returns the Directus user directly;
- cache header is `private, no-store`.

## Composable/browser

- logged-out initial state does not fetch;
- authenticated state fetches;
- manual `refresh()` refetches;
- login refreshes existing user state;
- logout clears;
- invalidation clears;
- auth token refresh does not refetch.

## SSR

- authenticated SSR user fetch works;
- incoming session cookie is forwarded;
- session rotation propagates `Set-Cookie` to outer SSR response;
- concurrent SSR requests remain isolated.

Do not write compile fixtures for exact configured-field or mapper-return inference in this pass.

---

# Expected removals

Actively remove dead artifacts after the simplification.

Expected removals include:

```text
#directus-user
DirectusUserProjection
current-user typegen
mapper typegen
user declaration templates
#directus-config-server dependency from current-user code
empty-config.ts
mapperEnabled
SSR user plugin
$directusUser NuxtApp injection
resolveDirectusUserResponse
optional injected runtime config
projection source/setup abstractions
manual runtime config guard chains
```

---

# Desired result

The feature should require only a handful of files.

Approximately:

```text
runtime/user/
├── app/
│   ├── use-directus-user.ts
│   ├── fetch-user.ts
│   └── plugin.client.ts
└── server/
    ├── create-handler.ts
    └── fetch-user.ts
```

The server handler itself may be generated during module setup so it can directly capture/import the
optional executable mapper without aliases.

Exact structure is flexible.

The important test is:

> Can someone unfamiliar with #314 understand the whole feature after reading these files for five
> minutes?

If not, simplify further.

# Non-goals

Do not solve in this pass:

- exact type inference from configured fields;
- exact mapper return inference in `useDirectusUser()`;
- generated current-user types;
- source aliases for current-user support;
- generic user projection infrastructure;
- generic transport injection;
- schema-aware mapper input inference.

Keep **fields** and **mapper support** because they are actual useful feature behavior.

Strip away the machinery that was built around them.
