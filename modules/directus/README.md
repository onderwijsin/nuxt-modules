# @onderwijsin/nuxt-directus

`@onderwijsin/nuxt-directus` provides a server-safe Directus REST foundation for Nuxt 4. The module
is being implemented incrementally; stages 1–3 establish package metadata, validated options,
private runtime configuration, the same-origin proxy route registration, and build-time schema
generation.

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
path and whether session authentication is enabled. Directus permission rules remain the
authorization boundary. The proxy currently returns `501` while its forwarding implementation is
developed in a later plan stage.

Typed runtime composables are delivered in later stages.

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
