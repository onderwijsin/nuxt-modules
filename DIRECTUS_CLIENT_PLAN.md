# Directus client module plan

## Goal and scope

Create `@onderwijsin/nuxt-directus`: a Nuxt 4 REST-only module that gives applications a typed,
server-safe Directus client, build-time schema generation, live-preview item lookup, and optional
cookie-backed session authentication. It intentionally excludes GraphQL, WebSockets, OAuth, and a
user-management store.

The package must be a real publishable module under `modules/directus`, not a port of the legacy
local module. The local module in `tmp/directus` is a useful behavioral source, but not an API to
preserve wholesale.

## Decisions made by this plan

### Credential and request boundary

The browser must never receive a Directus URL, static token, introspection token, access token, or
refresh token. `runtimeConfig.public.directus` may contain only non-sensitive module state such as
the configured local proxy prefix and whether session authentication is enabled.

- `moduleOptions.proxy.path` is a configurable, same-origin route prefix (default:
  `/_directus/proxy`). The browser SDK client targets that prefix and has `rest()` only. It has no
  `staticToken()` or `authentication()` composable.
- The Nitro proxy is the sole browser-to-Directus transport. It discards any inbound `Authorization`
  header and selects credentials on the server: a current authenticated-session access token takes
  precedence; otherwise it uses the configured static token; otherwise it makes an unauthenticated
  request. Browser callers cannot choose a token.
- Server code creates a fresh, per-request SDK REST client for the configured Directus base URL. It
  uses the same credential-selection policy, so session and static-token access work together
  without leaking state between requests. It calls Directus directly, never its own proxy.
- The proxy is deliberately a Directus REST pass-through rather than a client-facing token relay.
  Preserve method, validated request body, query string, useful request headers, response status,
  response body, and safe response headers; strip credentials, hop-by-hop headers, upstream
  `Set-Cookie`, and host/origin headers. Set route rules to prevent caching. Build URLs with a URL
  API/join helper after rejecting traversal and malformed paths, so an attacker cannot turn the
  proxy into an arbitrary upstream proxy.
- Validate `proxy.path` as an absolute local path, reject a root path and collisions with the
  module's auth routes, and register the corresponding Nitro route rule. Document that Directus
  permissions remain the authorization boundary; the proxy only prevents credential disclosure.

This intentionally corrects two legacy-module flaws: its public runtime config exposes the static
token, and its browser SDK adds that token before proxying.

### SDK shape and consumer extensibility

Use `@directus/sdk` as the transport and command/type source, but put client creation, credential
selection, preview handling, error normalization, and auth lifecycle behind module-owned helpers.
Concretely, the public API is the stable `useDirectus*` helpers and module types rather than an
exported `$directus` client contract that consumers must compose themselves. Those helpers accept
the SDK's `RestCommand` today and preserve its inferred result. This keeps consumer usage familiar
while ensuring that a future SDK typing repair, a small module type adapter, or a replacement
transport changes the module internals rather than every application call site.

SDK command auto-imports are consumer-configured. The default is `readItem` and `readItems`; the
module never auto-imports `withToken`. Server runtime imports `withToken` explicitly if it ever
needs it. The module validates each configured command against an explicit supported command-export
map at setup time and registers only that list:

```ts
directus: {
  commands: ["readItems", "readUsers", "createItem"];
}
```

Commands omitted from `commands` remain available through explicit imports from `@directus/sdk`. The
command map is deliberately a reviewed, version-pinned set rather than arbitrary package export
names, so invalid auto-import requests fail early and module upgrades can be tested. Public helper
signatures accept the SDK REST command type, preserve its inferred output type, and offer a narrowly
documented explicit output generic for SDK field-selection inference gaps.

Expose the following auto-imports:

| Surface                                                           | Purpose                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDirectus(command)`                                            | Execute a typed REST command through the injected browser/server app client. Browser requests always use the proxy.                                     |
| `useDirectusServer(command, event?)`                              | Execute a typed REST command directly from Nitro; resolve the current request event when available and accept an explicit `H3Event` for handlers/tasks. |
| `useDirectusItemByPath(collection, query, options?)`              | Query `readItems`, constrain to one result, and return its first item or `null`; applies preview/version context.                                       |
| `useDirectusServerItemByPath(event, collection, query, options?)` | Server equivalent of the preceding helper.                                                                                                              |
| `useDirectusError(error)`                                         | Normalize SDK, ofetch/H3, and raw Directus failures into a stable error result.                                                                         |
| `useDirectusAuth()`                                               | Optional reactive session-auth facade; auto-imported only when `auth.enabled` is true.                                                                  |

The word "path" means the application's lookup filter (usually a slug/path), not a Directus item
primary key. The helpers must **always** use `readItems(..., { ...query, limit: 1 })`, never
`readItem`. When a valid preview context includes a non-`main` version, add `version` to that
`readItems` query; when it contains a preview token, pass it only to the fresh server-side client
for that request. Do not make preview mode change lookup semantics. This meets the requirement that
path lookup works even when Directus's item ID is unknown.

### Live preview contract

Preview parsing is an internal shared utility used by both item-by-path helpers and the server
client factory; it is not a separate consumer composable. This is the same combined behavior as the
legacy `useDirectusItem`, but corrected to use `readItems` in every mode. Default query keys are
`preview`, `token`, and `version`; all three can be renamed. `moduleOptions.preview.enabled`
defaults to true and controls preview-token behavior. When false, the helpers ignore every preview
query parameter and never apply a preview token or version. A context is valid only when `preview`
is exactly the configured true value and required values are strings; never accept arrays. A preview
token has request scope only and overrides both session and static credentials for that request.

Version behavior belongs exclusively to `useDirectusItemByPath` and `useDirectusServerItemByPath`.
`moduleOptions.preview.versioning` defaults to true. When false, both helpers ignore the version
query parameter completely and never add `version` to `readItems`; all other enabled preview
behavior, including request-scoped preview-token handling, remains unchanged. When enabled, version
`main` is omitted and another validated version is added to `readItems`.

The implementation must not add automatic page refreshes. Live Preview already drives iframe updates
from Directus; application pages decide their own data-refresh strategy. Document the Directus-side
`frame-src`, application-side `frame-ancestors`, configured preview URL, and version placeholder
requirements.

### Type generation and `#directus`

Use `directus-sdk-typegen` as a build-time dependency to generate collection interfaces and the root
`Schema` from the private `typegen.introspectionToken`. Generation runs through a Nuxt type template
and produces one deterministic declaration at `.nuxt/types/directus-schema.d.ts`. Register a static
alias declaration before enabled guards, then map `#directus` to the generated declaration for both
Nuxt and the Node tsconfig. Consumers can use:

```ts
import type { Article, Schema } from "#directus";
```

Proposed option shape (final names and exact TypeScript types will be confirmed in implementation):

```ts
directus: {
  baseUrl: "https://cms.example.test", // private runtime config
  staticToken: process.env.DIRECTUS_STATIC_TOKEN, // optional, private runtime config
  proxy: { path: "/_directus/proxy" },
  commands: ["readItem", "readItems"],
  typegen: {
    introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN,
    cache: { maxAge: 3_600_000 }, // considered only in Nuxt development mode
    augmentations: {
      removeEnums: false // opt out after this augmenter has passed review
    },
    rules: {
      MyCollection: {
        myNestedField: "{ actualShape: string }"
      }
    },
    transform: (source, context) => source // optional advanced build-time extension
  }
}
```

`rules` is a deterministic collection/field-to-TypeScript-type override applied after generator
normalization. It is the supported answer to JSON fields whose actual shape is more specific. The
optional `transform` is an advanced, build-time-only escape hatch and receives the normalized source
plus generator metadata; it is never serialised into runtime config. Validate keys and type
expressions at the module boundary with Zod and fail with an actionable error when a named
collection/field is absent, rather than silently emitting stale types.

Implement source rewriting as a small deterministic declaration scanner (interface boundaries,
property names, comments, and multiline types), not a brittle global regex. Port the legacy
normalizers as named, module-provided augmentation candidates, applied in this order before consumer
`rules` and `transform`:

1. `removeEnums`
2. `replaceAnyWithUnknown`
3. `replaceJsonWithJSON`
4. `applyTypeNameOverrides`
5. `makeNonNullableOptionalsRequired`
6. `mergeJsDocs`

Audit every legacy augmenter before setting its default: document its intended input/output,
counterexamples, and whether its existing implementation is safe. In particular, do not carry over
the optional-property, JSDoc, enum, or text-replacement heuristics merely because they existed. Each
reviewed augmentation is individually opt-outable with
`moduleOptions.typegen.augmentations.<name> = false`; unreviewed augmentations are disabled by
default until their tests justify enabling them. Keep the implementation as a registry of named pure
transforms with documentation and fixtures for each transform, rather than a fixed opaque pipeline.
Snapshot-test the base output, each enabled/disabled augmentation, consumer rules, and custom
transform composition.

Caching is an optimization, never a source of truth: it applies **only** when Nuxt is running in
development mode. CI, `nuxt prepare` outside development, and every production build always bypass
the cache and regenerate when typegen is enabled. Development reuses a valid cached generated file
until `maxAge` expires. The cache manifest must include generator version, base URL fingerprint (not
credentials), augmentation/rule/transform fingerprint, and generation timestamp. Missing credentials
in development `nuxt prepare` produce a minimal valid `Schema` declaration only if no prior
generated declaration is available, accompanied by a clear warning; CI and regular production builds
with enabled typegen fail early. Never write generated types, cache files, or tokens into the
package or Git tree.

### Session authentication

Do not use the SDK's `authentication()` composable. It owns mutable client token state and can
refresh concurrently; that directly conflicts with a reactive Nuxt facade and rotating refresh
tokens.

When `auth.enabled` is true, module-owned Nitro handlers call Directus's REST auth endpoints using
the module's server client/`ofetch` transport:

- `POST .../login` accepts email/password/optional OTP, requests Directus JSON-token mode, then
  calls the internal `fetchDirectusCurrentUser()` utility with the new access token before
  persisting the session. It stores the access token, rotating refresh token, expiry timestamp, and
  derived identity/authorization snapshot in an httpOnly Nuxt cookie, then returns only the
  token-free auth state. A login catch can use `useDirectusError(error).isOtpError` to prompt for
  the optional Directus MFA code without inspecting raw error envelopes.
- `POST .../refresh` obtains the refresh token only from that cookie, is single-flight per session,
  rotates the entire stored token pair atomically, calls `fetchDirectusCurrentUser()` to rebuild the
  snapshot, and returns safe state. Requests arriving during the same refresh await the one
  operation; retries occur only after a successful refresh.
- `POST .../logout` attempts Directus logout with the cookie's refresh token, clears the local
  session regardless of upstream outcome, and returns 204.
- password-request and password-reset handlers proxy their narrow inputs to Directus; they do not
  require or expose a session. Password request must pass a consumer-supplied/validated reset URL,
  never derive an untrusted host header.
- `GET .../session` returns the persisted safe session snapshot without calling Directus. A server
  plugin/middleware refreshes only when an authenticated Directus request needs it; no periodic
  browser timer or `/users/me` call per request is required. Expired/invalid refresh tokens clear
  the session and surface a normalized 401 response.

The first release uses a module-owned, configurable plain httpOnly cookie (secure, sameSite, path,
domain, and max age are configurable). It stores a compact serialized session payload containing the
Directus tokens and token-free snapshot. It is intentionally not encrypted or signed: Directus is
the authorization authority, and a user who inspects or alters their own cookie cannot obtain data
outside the bearer access token's permissions. Module application code and browser JavaScript never
receive either token, but the cookie's contents may be visible to its holder on inspection.

This keeps the initial session design simple and stateless: no sealing secret, no H3 session
wrapper, and no Nitro storage. Encrypted/integrity-protected session cookies are a documented future
hardening feature, to be designed separately if the threat model warrants its complexity. Bound the
serialized payload to browser cookie limits (roughly 4 KB); fail safely rather than truncate it or
silently add server storage.

The cookie session is the persistent source of truth across SSR requests. It carries token material
and the token-free user snapshot together, so `GET .../session` and SSR can hydrate `useState`
without a fresh `/users/me` request. Login sets it, successful refresh atomically replaces it, and
logout or a failed refresh clears it. The client receives only the snapshot through SSR
payload/session endpoint; `useState` is therefore a reactive projection, not an in-memory
authentication store.

`ensureFreshDirectusSession(event)` is the shared server-only refresh gate. It runs immediately
before an authenticated Directus request, compares `expiresAt` to a small configured safety window,
and refreshes first only when necessary. Server Directus clients receive an SDK-compatible,
`ofetch.raw`-based fetch adapter whose pre-request hook calls this utility. The browser SDK does not
use that adapter: its Nitro proxy handler invokes the same utility before forwarding upstream. There
is no browser or server timer. If refresh succeeds, replace the cookie/session snapshot and proceed;
if it fails, clear the cookie, emit invalidation, and return the normalized failure.

```ts
import { createDirectus, rest } from "@directus/sdk";
import { ofetch } from "ofetch";

/** Builds the server-only fetch implementation consumed by the Directus REST SDK. */
function createSessionAwareDirectusFetch(event: H3Event) {
  const $directusFetch = ofetch.create({
    async onRequest() {
      await ensureFreshDirectusSession(event);
    }
  });

  // `.raw` preserves the Response required by the SDK rather than parsing its body.
  return $directusFetch.raw;
}

const client = createDirectus<Schema>(directusBaseUrl, {
  globals: { fetch: createSessionAwareDirectusFetch(event) }
}).with(rest());
```

The implementation must verify the exact `ofetch.raw`/SDK fetch types and response semantics with
unit tests; the important contract is one shared pre-request freshness gate, not this illustrative
function's final spelling.

Within one runtime instance, this utility uses a per-session single-flight promise so concurrent
requests share one refresh. Across Cloudflare isolates or separate Node instances, a plain cookie
cannot coordinate this lock: two requests can refresh the same token concurrently and one may lose
the rotation race. The first version explicitly accepts and documents that deployment-level
limitation; it must not claim a global refresh guarantee.

`fetchDirectusCurrentUser()` is the one internal server utility for calling the documented
current-user endpoint and building the safe snapshot. It requests only the required fields: user ID,
`admin_access`, `app_access`, assigned role, direct policies, and role policies. Directus does not
return this data from login/refresh. `hasRole` is the renamed public helper and evaluates the
effective role IDs; `hasPolicy` evaluates effective policy IDs. Direct user policies and policies
assigned through roles must both be included. Role inheritance/child-role resolution is a dedicated
implementation discovery item: traverse the actual role relation recursively on the server with
deduplication and cycle detection, persist the flattened effective IDs, and document its exact
direction/semantics after confirming the Directus schema/API. Do not guess, and do not promise that
`hasRole`/`hasPolicy` understands nested roles until this is verified and tested.

`useDirectusAuth()` owns the reactive projection and exposes exactly the requested surface:

```ts
const {
  isAuthenticated,
  isAdmin,
  isStudioUser,
  userId,
  hasRole,
  hasPolicy,
  sessionTimestamp,
  login,
  logout,
  requestPasswordReset,
  applyPasswordReset,
  _refresh,
  _isExpired,
  _expiresAt,
  _session
} = useDirectusAuth();
```

Its state contains only `userId`, effective role/policy IDs, admin/app-access flags, session
timestamp, and expiry—not either token. `userId` exposes the snapshot's user ID. `_session` exposes
the full safe `DirectusAuthSession` snapshot as a readonly ref/value (including its nested arrays);
it never exposes token material and consumers must not mutate it. `isAdmin` derives from Directus
`admin_access` and `isStudioUser` from `app_access`. Hydrate SSR-safely from the persisted snapshot
and avoid duplicate initial requests.

When `auth.enabled` is false, do not register or auto-import `useDirectusAuth`; applications that do
not opt into sessions should not receive an unusable auth API. Auth routes, auth plugin/middleware,
and auth lifecycle-hook types are likewise registered only when enabled.

Emit typed custom Nuxt app hooks after committed state transitions, with safe payloads only (never
tokens): `directus:auth:login`, `directus:auth:refresh`, `directus:auth:logout`, and
`directus:auth:invalidated` (failed/expired refresh). `login` and `refresh` handlers receive the
readonly safe `DirectusAuthSession` snapshot that is also exposed as `_session`; `logout` and
`invalidated` handlers receive the previous `userId` (or `null` only when no valid session could be
decoded). Augment Nuxt's hook types so consumers can use
`nuxtApp.hook("directus:auth:login", (session) => ...)` for side effects. Define ordering precisely:
login and refresh fire after the cookie session is written; logout after local clearing (whether
upstream logout succeeds); invalidated after clearing. Hook failures must be logged and must not
roll back an already-secure session transition.

Record the decision to avoid SDK `authentication()` and the complete session/refresh model in a new
internal architecture-decision record at `docs/decisions/directus-session-auth.md`. This is distinct
from the consumer README and captures rationale, alternatives, security properties, concurrency
rules, refresh failure behavior, cookie-only concurrency limitation, and future sealing/storage
alternatives.

### Error contract

Export strict Directus error types derived from the documented REST error contract: a literal union
of the documented core `extensions.code` values, a typed extension shape for documented contextual
fields (`collection`, `field`, `value`, `reason`, `path`, and development stack), and an open-string
escape hatch for extension-defined codes. This gives consumer code completion and safe narrowing
without rejecting legitimate custom Directus errors. Keep the union and its source reference tested
and versioned with the supported Directus SDK release.

`useDirectusError(error)` returns a stable discriminated result containing at least:

```ts
{
  isDirectusError: boolean,
  errors: readonly {
    message: string,
    code: DirectusErrorCode,
    extensions: DirectusErrorExtensions
  }[],
  statusCode?: number,
  isOtpError: boolean,
  invalidCredentials: boolean,
  tokenExpired: boolean
}
```

It recognizes Directus's `errors[]` envelope whether thrown directly by the SDK or nested in an
ofetch/H3 `data` payload, preserves every error (not only the first), and never throws while
normalizing unknown values. The `isDirectusError: true` branch exposes the strict error array; the
false branch has an empty array. It uses `extensions.code` for branching and preserves unknown
extension codes intact rather than depending on a narrow version-specific `@directus/errors` enum.

## Package layout and integration work

Follow the cookbook's publishable anatomy and local-module migration checklist:

```text
modules/directus/
├── src/
│   ├── module.ts                         # orchestration only
│   ├── config/options.schema.ts          # Zod boundary validation
│   ├── config/typegen.ts                 # fetch/cache/normalization/rules
│   ├── config/commands.ts                # validated consumer-selected SDK auto-imports
│   ├── types/options.ts                  # public option and resolved types
│   └── runtime/
│       ├── app/plugins/client.ts
│       ├── app/composables/{directus,directus-auth,directus-error,directus-item}.ts
│       ├── server/handlers/{proxy,auth}.ts # registered routes; proxy path is consumer-configured
│       ├── server/utils/{client,credentials,current-user,session,refresh,preview,item,error}.ts
│       └── types/{config,module,directus-schema-alias}.d.ts
├── __tests__/
├── playground/
├── README.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

The configurable proxy cannot rely on a file-system route: `src/module.ts` registers its handler
with Nuxt Kit's server-handler API at `proxy.path/**`; fixed module auth handlers may use the
reserved module auth prefix. The above is a responsibility map, not a literal final tree.
`src/module.ts` registers static type templates before an enabled guard, aliases,
composables/plugin/server scan directory, transpilation, protected runtime config, and non-cached
proxy/auth route rules. It merges existing config rather than replacing it. All published runtime
files explicitly import Nuxt/Vue/H3 dependencies.

Add exact catalog entries for `@directus/sdk` and `directus-sdk-typegen` only when implementation
starts; add `@directus/errors` only if a reviewed runtime need remains after the typed
envelope-based normalizer. Put packages imported by shipped runtime code in `dependencies`; keep
typegen-only build tooling out of browser runtime. Update the root module table, consumer README,
`skills/nuxt-directus/SKILL.md`, and the internal session-auth decision record under
`docs/decisions/`; create a changeset when shipping the public package.

## Playground

The module playground is a deliberate real-Directus integration surface, separate from deterministic
automated test fixtures. It reads its Directus URL, static token, and introspection token from
`modules/directus/playground/.env` and passes them as private module options. Add a committed
`.env.example` documenting the variable names with empty values; never commit the real `.env` or log
a token. The playground should fail clearly or show setup instructions when required variables are
absent.

The playground app must include:

- `app/pages/index.vue`: fetch and render a deliberately protected collection through
  `useDirectus(readItems(...))`, proving that browser-side data access succeeds through the Nitro
  proxy with the server-appended static token. Make the demonstration collection/query configurable
  through documented playground environment values so it is useful against real instances.
- `app/pages/[path].vue`: resolve the route parameter with
  `useDirectusItemByPath(collection, { filter: { path: { _eq: path } } })` (with collection and
  lookup-field configurable), and show the `null`, success, preview, and versioning outcomes.
- `app/pages/login.vue`: a real credential login flow using Nuxt UI's
  [`UAuthForm`](https://ui.nuxt.com/docs/components/auth-form). Start with email/password fields;
  when `useDirectusError(error).isOtpError` is true, reveal an OTP field and resubmit through
  `useDirectusAuth().login`. Render normalized non-OTP errors safely. Do not prefill or store login
  credentials in `.env`.
- `app/pages/_session.vue`: render the readonly, token-free `useDirectusAuth()._session` state plus
  derived flags and provide logout/navigation controls. It must never render either token or the raw
  session cookie.

Wrap the playground in the shared `UApp` shell required by Nuxt UI. It must exercise the actual
public module registration, runtime proxy, typegen, static-token flow, and optional authentication;
it is not a substitute for automated tests.

## Testing and external-consumer coverage

Testing is a first-class deliverable, not a coverage afterthought. Add extensive package-owned unit
tests for pure option validation, typegen/cache/augmentation transforms, typed error normalization,
preview/versioning parsing, cookie/session serialization, `/users/me` mapping, role recursion, and
refresh coordination. Add module setup tests for registrations, aliases, public-config secrecy,
conditional auth auto-imports, and invalid option paths/commands.

Add Nitro integration tests with a controlled Directus-like upstream for proxy forwarding,
credential precedence, static-token protected reads, all auth endpoints, OTP/error paths, refresh
rotation/failure, and lifecycle hook payloads. Add browser E2E coverage through the Nuxt proxy for
the index static-token read, `[path]` item lookup, preview/versioning opt-outs, login then OTP
retry, `/_session` rendering, logout, and relevant failure states. E2E tests must use local
fixtures/mocks, not a real hosted Directus instance or playground `.env` credentials.

Add `@onderwijsin/nuxt-directus` to the external-consumer fixture's packed-package installation and
Nuxt registration. The fixture must validate that the packaged module resolves in a clean consumer,
generated `#directus` declarations and configured auto-imports type-check, and module loading does
not expose credentials. Keep it deterministic with dummy configuration and a local/mock upstream; do
not make external-consumer validation depend on a real Directus deployment.

## Implementation sequence

1. Scaffold package metadata, playground, public types, README/consumer skill placeholders, and
   catalog/dependencies. Inspect the packed tarball early to ensure runtime types and templates are
   published.
2. Implement Zod option validation, configurable proxy path, consumer-selected command registration,
   and static runtime configuration declarations. Add module setup tests for disabled mode, config
   merging, aliases, registrations, invalid commands/paths, and no credential in public config.
3. Audit the legacy typegen augmenters, then implement pure typegen fetch/augmentation/rule/cache
   helpers and their fixture/snapshot tests. Wire the generated type template and verify `#directus`
   in a playground typecheck.
4. Implement fresh client factories, strict proxy forwarding, and generic typed command execution.
   Test all credential precedence paths, header stripping, URL/path rejection, method/body/query
   fidelity, and server-direct versus browser-proxy behavior.
5. Implement preview-context parsing and the two `readItems(..., limit: 1)` item helpers. Test main,
   named version, absent result, invalid query shapes, and request-scoped preview-token precedence.
6. Implement the documented strict Directus error union and normalization against SDK-style,
   ofetch-style, H3-style, malformed, extension-defined, and multi-error payloads.
7. Implement the plain httpOnly-cookie session, `/users/me` snapshot derivation, verified
   role/policy inheritance resolution, request-time freshness gate, in-instance single-flight
   refresh coordination, safe-state hydration, typed Nuxt hooks, and `useDirectusAuth`. Test
   login/OTP, logout, password flows, expiry, refresh rotation, concurrent same-instance refresh,
   cleared invalid session, snapshot persistence/no repeat `/users/me`, hook ordering, role
   recursion/cycles, worst-case cookie size, proxy/server freshness checks, and static-token
   fallback. Document the accepted cross-instance refresh race.
8. Complete documentation: security model, Directus permission implications, typegen and rules,
   command imports, auth API, cookie/deployment requirements, live preview/version setup, non-goals,
   and troubleshooting. Add the internal session-auth decision record; update the root table, skill,
   and changeset.
9. Run format/lint/type/unit/package/playground/external-consumer validation from the workspace
   cookbook, plus targeted Node and Cloudflare-compatible test fixtures. Do not commit generated
   output.

## Acceptance criteria

- `#directus` exposes generated interfaces and `Schema`; consumer rules replace a generated field
  type deterministically and fail clearly when stale.
- Typegen uses only the introspection token, always bypasses its cache in CI and production builds,
  and honors a fingerprinted cache only in Nuxt development mode. Every built-in legacy augmentation
  is individually opt-outable.
- No credentials appear in client bundles or `runtimeConfig.public`; browser Directus traffic goes
  through the same-origin proxy and server traffic does not.
- Consumer code may use arbitrary direct SDK commands after importing them, while `commands`
  controls the validated SDK command auto-import list and never auto-imports `withToken`.
- Both item-by-path helpers always use `readItems`, return `null` for no match, and correctly add
  preview version/token behavior without `readItem`; disabling version behavior makes the version
  query parameter a no-op.
- Error normalization supports the documented, strictly typed `errors[].extensions.code` envelope,
  context fields, extension-defined codes, and unknown non-Directus errors safely.
- Session auth supports password login with OTP, password request/reset, access/refresh rotation,
  `/users/me`-derived persisted authorization state, logout, lifecycle hooks, and request-time
  refresh; neither session token reaches application code or browser JavaScript. `useDirectusAuth`
  is registered only when enabled and exposes a readonly, token-free `_session` plus `userId`.
- The first version uses a bounded plain httpOnly cookie with no sealing or persistent server
  storage. It documents that Directus remains the authorization authority and that refresh
  single-flight is limited to one runtime instance.
- Extensive unit, module, Nitro integration, and browser E2E coverage exercises normal behavior and
  failure paths; E2E uses a controlled local Directus-like fixture rather than real credentials.
- The external-consumer fixture installs and registers the packed Directus module, type-checks its
  generated declarations/auto-imports, and remains deterministic without a hosted Directus instance.
- The package is Nuxt 4, Node 22+, and Cloudflare Workers compatible, documented, test-covered,
  packable, and externally consumer-validated.

## Research basis

- Directus's [SDK guide](https://directus.com/docs/guides/connect/sdk) confirms the composable
  client model, REST command pattern, `staticToken`, and the mutable `authentication()` behavior
  this plan intentionally avoids for sessions.
- Directus's [authentication API](https://directus.com/docs/api/authentication) documents login
  OTP/mode, password request/reset, logout, and refresh-token rotation responses.
- Directus's [error guide](https://directus.com/docs/guides/connect/errors) defines the REST/SDK
  `errors[].extensions.code` envelope used by the normalized error contract.
- Directus's [current-user endpoint](https://directus.com/docs/api/users#retrieve-current-user)
  supplies the role, policy, and app-access data absent from authentication responses.
- Nuxt's [custom event guide](https://nuxt.com/docs/4.x/guide/going-further/events) informs the
  typed app-hook contract for auth lifecycle side effects.
- Directus's [live preview guide](https://directus.com/docs/guides/content/live-preview) documents
  preview query parameters, optional access token, content-version URL propagation, and framing
  requirements.
- [`directus-sdk-typegen`](https://github.com/bryantgillespie/directus-sdk-typegen) generates the
  individual collection interfaces and aggregated `Schema` required by the Directus SDK.
- Repository guidance applied: the full module cookbook, especially
  [`migrating-local-modules.md`](docs/module-cookbook/migrating-local-modules.md), package anatomy,
  entrypoint/runtime registration, utilities, patterns, playground, testing, and consumer
  documentation articles.

## Future session hardening

The first release deliberately keeps the session as a plain httpOnly cookie. Directus is the
authorization authority: altering a local `userId`, role, policy, or expiry value does not grant
additional Directus permissions because the upstream API still evaluates the bearer access token.
The module must never treat the snapshot as an independent authorization decision. Browser
JavaScript and application code still cannot read the httpOnly cookie's tokens, although the cookie
holder can inspect or replay its contents.

If the threat model changes, introduce integrity protection first: sign the session payload so a
caller cannot change token metadata or the derived snapshot. Add encryption as well when the goal is
to prevent the cookie holder from inspecting/copying the Directus bearer credentials. A sealed
cookie would use a high-entropy server secret and a portable Web Crypto implementation such as H3's
session utilities; it adds secret rotation, cookie compatibility, and Node/Cloudflare verification
work. This is intentional hardening, not a prerequisite for the initial Directus integration.

Persistent shared session storage is a separate future capability. Its real benefit is distributed
refresh coordination, not Directus authorization: keep only a random session ID in the cookie and
place token material, snapshot, expiry, and a revision in shared storage. Before refreshing, an
instance acquires an atomic session-specific lease, re-reads the record, refreshes only if still
necessary, atomically writes the rotated token pair, then releases the lease. Other instances wait
or reload the newest record rather than spend the old refresh token.

Storage alone is insufficient: the lock/read/write sequence needs prompt consistency and atomicity.
Cloudflare Durable Objects, Redis-style atomic locks, or database transactions/row locks can supply
that; eventually consistent key-value storage generally cannot. Such a design also needs session-ID
creation, TTL cleanup, logout/deletion, lock-expiry recovery, deployment bindings, and failure-mode
documentation. Consider it when cross-instance refresh races become a real production issue, cookie
payloads exceed browser limits, or the security model requires tokens to be unreadable and
untamperable by their holder.
