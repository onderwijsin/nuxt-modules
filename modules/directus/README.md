# @onderwijsin/nuxt-directus

`@onderwijsin/nuxt-directus` provides server-safe, typed Directus REST access for Nuxt 4. The module
is being implemented incrementally; stages 1–6 establish package metadata, validated options,
private runtime configuration, same-origin proxy forwarding, build-time schema generation,
preview-aware item lookup, and error normalization.

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-directus"],
  directus: {
    baseUrl: process.env.DIRECTUS_URL,
    staticToken: process.env.DIRECTUS_STATIC_TOKEN,
    proxy: { path: "/_directus/proxy" },
    commands: ["readItem", "readItems"]
  }
});
```

Directus credentials are server-only. The browser-safe runtime configuration contains only the proxy
path, non-sensitive preview settings, and whether session authentication is enabled. Browser SDK
requests target the same-origin proxy; server-side requests target Directus directly with a fresh
request-scoped client. The proxy discards inbound credentials and selects the configured static
token on the server. Directus permission rules remain the authorization boundary.

## REST commands

The module auto-imports the commands listed in `directus.commands` (default: `readItem` and
`readItems`) and provides `useDirectus` for execution:

```ts
const articles = await useDirectus(readItems("articles", { limit: 10 }));
```

The client exposes REST only. Other SDK commands can still be explicitly imported from
`@directus/sdk`; `commands` controls only the validated auto-import list.

Nitro handlers can use `useDirectusServer(command, event?)` to bypass the browser proxy while
retaining the same typed command and server credential policy.

## Type generation

When both `baseUrl` and `typegen.introspectionToken` are configured, Nuxt generates a deterministic
Directus declaration at `#directus` during preparation/build:

```ts
directus: {
  baseUrl: "https://cms.example.test",
  typegen: {
    introspectionToken: process.env.DIRECTUS_INTROSPECTION_TOKEN,
    cache: { maxAge: 3_600_000 },
    rules: {
      Article: { metadata: "Record<string, string>" }
    }
  }
}
```

Set `typegen.enabled: false` when an application does not use generated Directus types, such as a
consumer that only needs the runtime proxy. When enabled, production and CI builds fail clearly if
the private base URL or introspection token is incomplete.

Use a type-only import because the generated declaration has no runtime exports:

```ts
import type { ExtensionSeoMetadata } from "#directus";
```

Rules target generated interface and field names and fail clearly when either name is stale. The
development cache is fingerprinted by generator version, base URL, augmentation settings, rules, and
transform source; it is bypassed outside development and in CI. Cache files stay under `.nuxt` and
never contain credentials.

The six legacy normalization candidates are available but disabled by default because each can
change valid generated declarations: `removeEnums`, `replaceAnyWithUnknown`, `replaceJsonWithJSON`,
`applyTypeNameOverrides`, `makeNonNullableOptionalsRequired`, and `mergeJsDocs`. Each is a pure,
individually enabled transform and is covered by a focused fixture. An optional
`transform(source, context)` runs last and is build-time only; it is never placed in runtime
configuration.

| Transform                          | Intended input/output                                             | Important counterexample                                                         |
| ---------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `removeEnums`                      | Remove generated `export enum` declarations.                      | Referenced enum types can become unresolved.                                     |
| `replaceAnyWithUnknown`            | Replace `Record<..., any>` field values with `unknown`.           | Consumers may rely on the generator's permissive `any`.                          |
| `replaceJsonWithJSON`              | Replace quoted `"json"`/`'json'` type literals with `JSON`.       | A literal field whose actual value is the string `json` would be widened.        |
| `applyTypeNameOverrides`           | Correct reviewed generated type names such as `CandidateStatuse`. | A custom collection can intentionally use the legacy spelling.                   |
| `makeNonNullableOptionalsRequired` | Mark simple non-nullable optional fields as required.             | Directus metadata can omit a field even when the generated type is non-nullable. |
| `mergeJsDocs`                      | Merge adjacent JSDoc tag blocks and deduplicate tags.             | Free-form prose in adjacent blocks is not retained by this candidate.            |

## Preview item lookup and errors

`useDirectusItemByPath(collection, query)` and its server equivalent return the first result or
`null`. Normal lookups use `readItems` with a limit of one. With preview enabled (the default),
`preview=true` accepts a request-scoped `token`; a versioned preview must also provide the Directus
item `id`, after which the helper switches to `readItem(id, { version })` because Directus content
versions are fetched by item ID. Preview tokens are never placed in public runtime configuration.

`useDirectusError(error)` normalizes Directus SDK, ofetch, and H3 error envelopes. It preserves
unknown extension codes for logging while recognizing common UI-relevant codes such as `FORBIDDEN`,
`INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FAILED_VALIDATION`, and `REQUESTS_EXCEEDED`. It exposes
shortcuts such as `isInvalidCredentialError`, `isForbiddenError`, `isTokenExpiredError`,
`isValidationError`, `isRateLimitError`, and `isServiceUnavailableError`. The existing `isOtpError`,
`invalidCredentials`, and `tokenExpired` flags remain available for compatibility.
