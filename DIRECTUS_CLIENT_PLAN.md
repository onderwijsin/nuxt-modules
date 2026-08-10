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
the local proxy prefix and whether session authentication is enabled.

- The browser SDK client targets a same-origin route, for example `/_directus/proxy/**`, and has
  `rest()` only. It has no `staticToken()` or `authentication()` composable.
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
- Keep the proxy prefix configurable and reserved. Document that Directus permissions remain the
  authorization boundary; the proxy only prevents credential disclosure.

This intentionally corrects two legacy-module flaws: its public runtime config exposes the static
token, and its browser SDK adds that token before proxying.

### SDK shape and consumer extensibility

Use `@directus/sdk` as the transport and command/type source, but put all creation, credential
selection, preview handling, error normalization, and auth lifecycle behind module-owned helpers. Do
not build the public API around the raw SDK client type: the SDK's types are known to be imperfect
and this preserves a future migration path to module-owned command/type adapters.

Auto-import only the intentionally small baseline SDK command set:

- `readItem`, `readItems`, and `withToken` (the latter remains useful for explicit server-only
  single-command credentials, but must never cause a browser token to be exposed).

Applications import every other SDK command directly from `@directus/sdk`; the module will not
maintain a growing command allowlist. Public helper signatures accept the SDK REST command type,
preserve its inferred output type, and offer a narrowly documented explicit output generic for SDK
field-selection inference gaps.

Expose the following auto-imports:

| Surface                                                           | Purpose                                                                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDirectus(command)`                                            | Execute a typed REST command through the injected browser/server app client. Browser requests always use the proxy.                                     |
| `useDirectusServer(command, event?)`                              | Execute a typed REST command directly from Nitro; resolve the current request event when available and accept an explicit `H3Event` for handlers/tasks. |
| `useDirectusItemByPath(collection, query, options?)`              | Query `readItems`, constrain to one result, and return its first item or `null`; applies preview/version context.                                       |
| `useDirectusServerItemByPath(event, collection, query, options?)` | Server equivalent of the preceding helper.                                                                                                              |
| `useDirectusPreview(eventOrRoute?)`                               | Parse, validate, and expose configured preview query keys without scattering `useRoute()`/`getQuery()` logic.                                           |
| `useDirectusError(error)`                                         | Normalize SDK, ofetch/H3, and raw Directus failures into a stable error result.                                                                         |
| `useDirectusAuth()`                                               | Optional reactive session-auth facade described below.                                                                                                  |

The word "path" means the application's lookup filter (usually a slug/path), not a Directus item
primary key. The helpers must **always** use `readItems(..., { ...query, limit: 1 })`, never
`readItem`. When a valid preview context includes a non-`main` version, add `version` to that
`readItems` query; when it contains a preview token, pass it only to the fresh server-side client
for that request. Do not make preview mode change lookup semantics. This meets the requirement that
path lookup works even when Directus's item ID is unknown.

### Live preview contract

Default query keys are `preview`, `token`, and `version`, but expose an option to rename them and an
explicit opt-in/disable switch. A context is valid only when `preview` is exactly the configured
true value and required values are strings; never accept arrays. A preview token has request scope
only and overrides both session and static credentials for that request. Version `main` is omitted;
any other validated version is sent with `readItems`.

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
  typegen: {
    introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN,
    cache: { maxAge: 3_600_000, bypass: false },
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
property names, comments, and multiline types), not a brittle global regex. Keep generator cleanup
as explicit pure transforms: safe `unknown` replacements, known generator typo corrections, enum
policy only if confirmed needed, and then consumer rules. Snapshot test generator output and custom
rule application. Do not silently make optional generator properties required—the legacy heuristic
is speculative and changes the CMS contract. Any requiredness normalization must be a separately
documented opt-in decision later.

Caching is an optimization, never a source of truth: production/build always regenerates when
typegen is enabled; development reuses a valid cached generated file until `maxAge` expires. The
cache manifest must include generator version, base URL fingerprint (not credentials),
rule/transform fingerprint, and generation timestamp. Missing credentials in `nuxt prepare` produce
a minimal valid `Schema` declaration only if no prior generated declaration is available,
accompanied by a clear warning; regular production builds with enabled typegen fail early. Never
write generated types, cache files, or tokens into the package or Git tree.

### Session authentication

Do not use the SDK's `authentication()` composable. It owns mutable client token state and can
refresh concurrently; that directly conflicts with a reactive Nuxt facade and rotating refresh
tokens.

When `auth.enabled` is true, module-owned Nitro handlers call Directus's REST auth endpoints using
the module's server client/`ofetch` transport:

- `POST .../login` accepts email/password/optional OTP, requests Directus JSON-token mode, stores
  the access token, rotating refresh token, expiry timestamp, and a small derived identity snapshot
  in a secure, encrypted/sealed httpOnly Nuxt session cookie, then returns only safe auth state.
- `POST .../refresh` obtains the refresh token only from that cookie, is single-flight per session,
  rotates the entire stored token pair atomically, and returns safe state. Requests arriving during
  the same refresh await the one operation; retries occur only after a successful refresh.
- `POST .../logout` attempts Directus logout with the cookie's refresh token, clears the local
  session regardless of upstream outcome, and returns 204.
- password-request and password-reset handlers proxy their narrow inputs to Directus; they do not
  require or expose a session. Password request must pass a consumer-supplied/validated reset URL,
  never derive an untrusted host header.
- `GET .../session` returns the safe reactive state, optionally refreshing close to expiry. A server
  plugin/middleware refreshes only when an authenticated Directus request needs it; no periodic
  browser timer is required. Expired/invalid refresh tokens clear local state and surface a
  normalized 401 response.

Use a module-owned, configurable cookie name and cookie attributes (httpOnly always true; secure,
sameSite, path, domain, max age), with a required server-only sealing secret whenever auth is
enabled. Do not put tokens or the secret in public runtime config. Confirm the chosen H3/Nitro
session primitive supports encrypted/sealed payloads on both Node and Cloudflare Workers; if it does
not, store only an opaque session id in the cookie and use Nitro storage with a compatible driver.
This verification is a hard implementation gate, not a reason to fall back to readable or
signed-only token cookies.

`useDirectusAuth()` owns `useState` state and exposes exactly the requested surface:

```ts
const {
  isAuthenticated,
  isAdmin,
  isStudioUser,
  isRole,
  hasPolicy,
  sessionTimestamp,
  login,
  logout,
  requestPasswordReset,
  applyPasswordReset,
  _refresh,
  _isExpired,
  _expiresAt
} = useDirectusAuth();
```

Its state contains only `userId`, role/policy IDs, admin/app-access flags, session timestamp, and
expiry—not either token. Establish precise semantics during implementation: `isAdmin` derives from
the Directus admin flag; `isStudioUser` derives from app access; `isRole` and `hasPolicy` compare
IDs from the server-authoritative session snapshot. Load it SSR-safely through the session endpoint
or injected payload, avoid duplicate initial requests, and keep auth disabled behavior explicit
(safe inert composable plus a useful configuration error for mutation methods).

### Error contract

`useDirectusError(error)` returns a stable object containing at least:

```ts
{
  isDirectusError: boolean,
  errors: readonly {
    message: string,
    code?: string,
    extensions: Record<string, unknown>
  }[],
  statusCode?: number,
  isOtpError: boolean,
  invalidCredentials: boolean,
  tokenExpired: boolean
}
```

It recognizes Directus's `errors[]` envelope whether thrown directly by the SDK or nested in an
ofetch/H3 `data` payload, preserves every error (not only the first), and never throws while
normalizing unknown values. It uses `extensions.code` for branching, keeps unknown
Directus/extension codes intact, and does not depend on a narrow version-specific `@directus/errors`
enum.

## Package layout and integration work

Follow the cookbook's publishable anatomy and local-module migration checklist:

```text
modules/directus/
├── src/
│   ├── module.ts                         # orchestration only
│   ├── config/options.schema.ts          # Zod boundary validation
│   ├── config/typegen.ts                 # fetch/cache/normalization/rules
│   ├── config/commands.ts                # three supported auto-imports
│   ├── types/options.ts                  # public option and resolved types
│   └── runtime/
│       ├── app/plugins/client.ts
│       ├── app/composables/{directus,directus-auth,directus-error,directus-item,preview}.ts
│       ├── server/api/_directus/{proxy/[...path],auth/{login,logout,refresh,session,password-request,password-reset}}.post.ts
│       ├── server/utils/{client,credentials,session,refresh,preview,item,error}.ts
│       └── types/{config,module,directus-schema-alias}.d.ts
├── __tests__/
├── playground/
├── README.md
├── CHANGELOG.md
├── package.json
└── tsconfig.json
```

Adjust route filenames to Nuxt's actual server route conventions during implementation; the above is
a responsibility map, not a literal final tree. `src/module.ts` registers static type templates
before an enabled guard, aliases, composables/plugin/server scan directory, transpilation, protected
runtime config, and non-cached proxy/auth route rules. It merges existing config rather than
replacing it. All published runtime files explicitly import Nuxt/Vue/H3 dependencies.

Add exact catalog entries for `@directus/sdk` and `directus-sdk-typegen` only when implementation
starts; add `@directus/errors` only if a reviewed runtime need remains after the envelope-based
normalizer. Put packages imported by shipped runtime code in `dependencies`; keep typegen-only build
tooling out of browser runtime. Update the root module table, consumer README, and
`skills/nuxt-directus/SKILL.md`; create a changeset when shipping the public package.

The playground uses fake/no credentials by default and demonstrates generated fallback types,
proxied public reads with a local mock upstream, error rendering, preview query propagation, and the
auth facade. No test or playground logs a token.

## Implementation sequence

1. Scaffold package metadata, playground, public types, README/consumer skill placeholders, and
   catalog/dependencies. Inspect the packed tarball early to ensure runtime types and templates are
   published.
2. Implement Zod option validation and static runtime configuration declarations. Add module setup
   tests for disabled mode, config merging, aliases, registrations, and no credential in public
   config.
3. Implement pure typegen fetch/normalization/rule/cache helpers and their fixture/snapshot tests.
   Wire the generated type template and verify `#directus` in a playground typecheck.
4. Implement fresh client factories, strict proxy forwarding, and generic typed command execution.
   Test all credential precedence paths, header stripping, URL/path rejection, method/body/query
   fidelity, and server-direct versus browser-proxy behavior.
5. Implement preview-context parsing and the two `readItems(..., limit: 1)` item helpers. Test main,
   named version, absent result, invalid query shapes, and request-scoped preview-token precedence.
6. Implement error normalization against SDK-style, ofetch-style, H3-style, malformed, and
   multi-error payloads.
7. Verify the H3/Nitro sealed-session primitive on Node and Cloudflare Workers, then implement auth
   handlers, single-flight refresh coordination, safe-state hydration, and `useDirectusAuth`. Test
   login/OTP, logout, password flows, expiry, refresh rotation, concurrent refresh, cleared invalid
   session, and static-token fallback.
8. Complete documentation: security model, Directus permission implications, typegen and rules,
   command imports, auth API, cookie/deployment requirements, live preview/version setup, non-goals,
   and troubleshooting. Update the root table, skill, and changeset.
9. Run format/lint/type/unit/package/playground/external-consumer validation from the workspace
   cookbook, plus targeted Node and Cloudflare-compatible test fixtures. Do not commit generated
   output.

## Acceptance criteria

- `#directus` exposes generated interfaces and `Schema`; consumer rules replace a generated field
  type deterministically and fail clearly when stale.
- Typegen uses only the introspection token, always regenerates for production builds, and honors a
  fingerprinted development cache.
- No credentials appear in client bundles or `runtimeConfig.public`; browser Directus traffic goes
  through the same-origin proxy and server traffic does not.
- Consumer code may use arbitrary direct SDK commands after importing them, while only the three
  baseline commands are auto-imported.
- Both item-by-path helpers always use `readItems`, return `null` for no match, and correctly add
  preview version/token behavior without `readItem`.
- Error normalization supports the documented `errors[].extensions.code` envelope and unknown errors
  safely.
- Session auth supports password login with OTP, password request/reset, access/refresh rotation,
  session inspection, logout, and concurrent-refresh safety; neither session token ever reaches
  JavaScript.
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
- Directus's [live preview guide](https://directus.com/docs/guides/content/live-preview) documents
  preview query parameters, optional access token, content-version URL propagation, and framing
  requirements.
- [`directus-sdk-typegen`](https://github.com/bryantgillespie/directus-sdk-typegen) generates the
  individual collection interfaces and aggregated `Schema` required by the Directus SDK.
- Repository guidance applied: the full module cookbook, especially
  [`migrating-local-modules.md`](docs/module-cookbook/migrating-local-modules.md), package anatomy,
  entrypoint/runtime registration, utilities, patterns, playground, testing, and consumer
  documentation articles.
