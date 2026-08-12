# Refactoring plan: infer module option types from schemas

## End goal

Make each module's Zod schema in `src/config/options.schema.ts` the single source of truth for
module options and their public TypeScript types:

- each options schema exports the schema-derived `ModuleOptions` type (the consumer input shape)
  and, where needed, `ResolvedModuleOptions` (the validated/output shape);
- no module keeps a redundant `src/types/options.ts` that repeats or merely infers the schema;
- no module keeps a `src/types/` directory solely to hold module options;
- types that describe runtime/public domain data rather than module setup options live under
  `src/runtime/types/`, are emitted with the runtime, and remain available through the module's
  existing public runtime exports where applicable;
- public type names and consumer behavior remain compatible unless a deliberate compatibility
  decision is recorded during implementation.

## Why make this change

The current split between `src/config/options.schema.ts` and `src/types/options.ts` often creates
two representations of one contract. In the simplest cases the second file only contains:

```ts
export type ModuleOptions = z.input<typeof optionsSchema>;
export type ResolvedModuleOptions = z.output<typeof optionsSchema>;
```

That indirection makes the source of truth harder to discover and encourages handwritten option
types to drift from runtime validation. Keeping schema-derived types beside the schema makes the
boundary explicit, lets Zod model the actual contract, and removes empty or misleading type-only
directories. Runtime/domain types have a different ownership boundary, so moving them to
`src/runtime/types/` keeps them with the code that consumes and publishes them.

## Guardrails and sequencing

This is a public-type and package-layout refactor. It must not be treated as a blind bulk rename.
The implementation should:

1. preserve all existing working-tree changes;
2. preserve public type names and package/runtime exports where consumers can import them;
3. compare `z.input` and `z.output` deliberately—defaults commonly make the input and output shapes
   different;
4. add or update schema tests for defaults, strictness, unions, catch-all fields, and manifest
   entries where the schema becomes more expressive;
5. update affected module READMEs and matching consumer skills when public option/type exports or
   documented contracts change;
6. use one appropriately scoped Changeset per public-package concern, rather than one unrelated
   Changeset for the whole repository;
7. run focused checks after each risky module and the complete workspace checks after the full
   refactor.

### Batch 1: straightforward changes, reviewed as one batch

These modules should be handled first. They are primarily schema/type co-location, deletion of
redundant files, or relocation of already-authored runtime types:

`cache`, `device`, `directus-config`, `directus`, `directus-sitemaps`, `healthcheck`,
`loops-renderer`, `newsletter-signup`, `redirects`, `simple-rate-limiter`, `static-text`,
`storage-admin`, `turnstile`, and `ui-form-extensions`.

The human collaborator should review the Batch 1 diff and focused validation before any of the
modules below is changed.

### Batch 2: one module at a time, with human review between modules

These modules require more than mechanical file movement or have material public-type/schema design
implications:

1. `sentry-config`
2. `theme-customizer`
3. `webmanifest`

For each module, stop after implementation and focused validation, present the diff and
compatibility impact to the human collaborator, and only then continue to the next module.

## Per-module plan

The current checkout contains 17 module directories under `modules/` (the inventory is listed
below). The earlier audit referred to roughly 18 modules; this plan covers every module currently
present and should be extended if an eighteenth module is added or was intentionally omitted from
the checkout.

### 1. `cache`

- Keep `src/config/options.schema.ts` as the owning source.
- Add `ModuleOptions = z.input<typeof cacheOptionsSchema>` and
  `ResolvedModuleOptions = z.output<typeof cacheOptionsSchema>` beside the schema.
- Update `src/module.ts` and any build-time consumers to import the types from the schema.
- Delete `src/types/options.ts`; remove the now-empty `src/types/` directory.
- Preserve the distinction between consumer input and validated output, especially the defaults for
  `enabled`, `adminHeaderName`, `devAuthBypass`, and `maxInvalidatedEntries`.
- Run the cache-focused tests and typecheck before the Batch 1 review.

### 2. `device`

- Replace the handwritten `ModuleOptions` interface with schema inference from
  `deviceOptionsSchema`.
- Export the inferred option type from `src/config/options.schema.ts` and update `src/module.ts`.
- Preserve the public option shape and the default user-agent behavior; verify that the schema's
  `defaultUserAgent` output remains distinct from the input type where appropriate.
- Delete `src/types/options.ts` and the forwarding `src/types/index.ts`.
- Keep runtime declarations under `src/runtime/types/`; they are unrelated to this refactor.

### 3. `directus-config`

- Treat the existing `src/options.schema.ts` as the precedent for the target pattern: it already
  exports `ModuleOptions` next to the schema and has no `src/types/` directory.
- Do not create or move any types here.
- If consistency is desired during implementation, consider moving the schema to
  `src/config/options.schema.ts`, but only if package exports and existing imports can be preserved
  without broadening this refactor. This is optional cleanup, not a prerequisite.
- Verify that the existing inline `ModuleOptions` remains the public module option type.

### 4. `directus`

- Move the two inferred aliases from `src/types/options.ts` into `src/config/options.schema.ts`
  beside `directusOptionsSchema`.
- Update `src/module.ts` and `src/config/typegen.ts` to import from the schema.
- Delete `src/types/options.ts` and remove the empty directory.
- Preserve `ResolvedModuleOptions` because type generation uses the validated nested client
  configuration, including the typegen fields.
- Do not move runtime declarations in `src/runtime/types/`.

### 5. `directus-sitemaps`

- Add inferred `ModuleOptions` and `ResolvedModuleOptions` beside `directusSitemapsOptionsSchema`.
- Update `src/module.ts` and any config/build-time consumers to import from the schema.
- Delete `src/types/options.ts` and the empty directory.
- Preserve the input/output distinction for `prefault`-based collections and sitemap options.
- Keep all existing runtime declarations in `src/runtime/types/` untouched.

### 6. `healthcheck`

- Move the inferred option aliases beside `healthcheckOptionsSchema`.
- Update `src/module.ts` imports and delete `src/types/options.ts`.
- Preserve the schema's threshold refinement and the output defaults; do not replace the schema with
  a handwritten interface.
- Keep `src/runtime/types/health.ts`, which contains runtime health result/component types and is
  not an options file.

### 7. `loops-renderer`

- Infer `ModuleOptions` from the schema in `src/config/options.schema.ts`; update `src/module.ts`.
- Remove the handwritten module-options portion from `src/types/index.ts`.
- Re-evaluate `LoopsRendererConfig`: it is effectively the module's `applyInlineStyles` and
  `evaluate` shape plus one local `debug` flag. Inline the per-renderer `debug` property where it is
  used and use an appropriate inferred/derived config shape for the remaining shared fields, rather
  than retaining a standalone module-options type file.
- Update runtime component props and `createLoopsRendererConfig` consistently. Keep the public
  `debug` behavior documented and unchanged.
- The existing runtime file `src/runtime/types.ts` is already a runtime-owned location; decide
  whether it can be reduced or removed after the config prop is inlined. Do not create a new
  build-time `src/types/` directory.
- Add focused type/runtime tests for config merging and debug rendering if the refactor changes the
  prop declarations.

### 8. `newsletter-signup`

- Replace the handwritten option interfaces with types inferred from
  `newsletterSignupOptionsSchema`.
- If named provider/list/field/endpoint types are needed by implementation or public exports, derive
  them from schema components rather than maintaining a second handwritten copy.
- Preserve the discriminated provider union, provider-specific Mailchimp `server` requirement, and
  the no-provider branch.
- Update `src/module.ts` and runtime code imports as needed, then delete `src/types/options.ts`.
- Confirm that the inferred input type still supports the intended consumer configuration and that
  the output type reflects schema normalization/defaults.

### 9. `redirects`

- Move the genuine redirect domain types from `src/types/redirect.ts` to
  `src/runtime/types/redirect.ts`: `Redirect`, `ResolvedRedirect`, `RedirectIndex`,
  `DynamicRedirectRule`, and `RedirectSource`.
- Update all runtime imports and preserve the existing runtime subpath exports from
  `src/runtime/index.ts` and `src/runtime/source.ts`.
- Move `ModuleOptions` and `ResolvedModuleOptions` from `src/types/options.ts` into
  `src/config/options.schema.ts` and update `src/module.ts`.
- Delete the old `src/types/` directory after all imports are updated.
- Verify that the packed runtime still emits the moved types and that public imports such as the
  redirect runtime helpers/types remain compatible.

### 10. `simple-rate-limiter`

- Replace the handwritten nested `ModuleOptions` interface with `z.input` inference beside
  `simpleRateLimiterOptionsSchema`.
- Update `src/module.ts` and derive the `DEFAULTS` check from the schema-owned option type.
- Delete `src/types/options.ts` and the empty directory.
- Preserve the optional input shape and the resolved runtime defaults for global pruning.
- Keep `src/runtime/types/config.d.ts`, which is a generated consumer runtime declaration.

### 11. `static-text`

- Move the genuine dictionary/translator types from `src/types/dictionary.ts` to
  `src/runtime/types/dictionary.ts`: `TextDictionary`, `TextKey`, and `TextTranslator`, along with
  their private type-level helpers.
- Update runtime imports and preserve the module's public type exports from the package root and
  runtime entrypoints as applicable.
- Infer `ModuleOptions` from `staticTextOptionsSchema` in the schema file and update
  `src/module.ts`.
- Delete `src/types/options.ts` and the old `src/types/` directory.
- Preserve the recursive dotted-key and placeholder-parameter behavior; this is real public
  type-level functionality and must not be replaced by a broad `Record<string, unknown>` type.

### 12. `storage-admin`

- Move inferred `ModuleOptions` and `ResolvedModuleOptions` beside `storageAdminOptionsSchema`.
- Update `src/module.ts` and all build-time imports, then delete `src/types/options.ts`.
- Preserve the strict mount validation, defaults, permission literals, and UI path constraints
  through the schema output type.
- Keep the runtime config declaration in `src/runtime/types/` unchanged.

### 13. `turnstile`

- Confirm the intended contract: the handwritten public type makes all options optional because
  `defaults` supplies values, while the schema currently requires the key fields.
- Encode the defaults in `turnstileOptionsSchema` (`enabled`, site key, secret key, admin token, and
  header name) so that schema input/output matches the current module setup contract.
- Then export `ModuleOptions` and, if useful to validation consumers, `ResolvedModuleOptions` from
  the schema and update `src/module.ts`.
- Delete `src/types/options.ts`.
- Add/adjust schema tests to prove omitted options are accepted and resolved to the same defaults
  currently supplied by `DEFAULTS`. Do not accidentally make secrets public or alter runtime config
  behavior.
- Keep `src/runtime/types/errors.ts` and `src/runtime/types/config.d.ts`; those are runtime types,
  not module option declarations.

### 14. `ui-form-extensions`

- Add `src/config/options.schema.ts` with the established minimal enabled-option schema, using the
  shared `enabled` primitive where that matches neighboring modules.
- Export the inferred `ModuleOptions` beside the schema and update `src/module.ts` to import it.
- Add module defaults if required to preserve the current `moduleSetup` enabled behavior; verify
  this against the module's existing runtime contract rather than guessing.
- Delete `src/types/index.ts` and remove the now-empty `src/types/` directory.
- Add a focused schema/module test if the new schema introduces a new validation boundary.

### 15. `sentry-config` — Batch 2, first human review gate

- Replace the handwritten `ModuleOptions`, `SentryTestToolsOptions`, and route option interfaces
  with schema-derived types.
- Move the supported runtime tuple into the schema module as the schema's literal source, then
  derive `SentryRuntime` from that tuple so the existing public name remains available.
- Update the schema to represent the current handwritten contract exactly, including the shared base
  module options and optional nested diagnostic route shapes. Defaults should be modeled in the
  schema, not only in `defineNuxtModule` defaults, where that is required for input typing.
- Export `ModuleOptions`, `ResolvedModuleOptions` if needed, `SentryRuntime`, and the diagnostic
  option aliases from `src/config/options.schema.ts` or a deliberately documented public schema
  export surface; do not recreate `src/types/options.ts` under another name.
- Update `src/module.ts` and `src/config/runtime.ts` imports and preserve the package root's public
  type exports and the consumer skill contract.
- Delete `src/types/options.ts` only after checking emitted declarations and external imports.
- Add focused tests for omitted defaults, `false` diagnostic tools, route path validation, and the
  runtime union. Stop for human review after this module before starting theme-customizer.

### 16. `theme-customizer` — Batch 2, second human review gate

- Treat this as a schema/type design refactor, not a file deletion.
- Compare every authored shape with the schema: theme shades/palettes, Google Fonts options, rate
  limits, defaults, named groups, and the dynamic catch-all color groups.
- Move reusable schema components to named exports where needed and use `z.infer`, `z.input`,
  `z.output`, or carefully chosen Zod transforms/refinements to derive the public option types.
- Preserve the smarter authored constraints: complete shade palettes, non-empty primary groups,
  unique palette names across groups, valid Google Fonts limits, rate-limit bounds, and the dynamic
  group index signature. If Zod cannot express an ergonomic public type directly, apply a documented
  schema-side type augmentation or a narrow derived type without restoring a second handwritten
  options interface.
- Separate true module options from runtime/app UI types. Types such as component props and runtime
  app state belong under `src/runtime/app/types.ts` or another runtime-owned location, not in an
  options file.
- Preserve the public exports currently provided by `src/module.ts`, including
  `ThemeCustomizerOptions`, palette/group helpers, and shade constants, or document an intentional
  compatibility change before implementing it.
- Update config helpers, runtime imports, tests, README, and the matching consumer skill as needed.
  Delete `src/types/index.ts` only when all option and domain exports have an intentional new owner.
- Validate schema inference and public type ergonomics with focused tests and a package build. Stop
  for human review before starting webmanifest.

### 17. `webmanifest` — Batch 2, third human review gate

- Keep the W3C manifest model as a public/runtime domain type, but move it from
  `src/types/manifest.ts` to `src/runtime/types/manifest.ts`.
- Replace `z.record(z.string(), z.unknown()).optional()` with a full manifest schema matching the
  current authored model: core metadata, display/orientation unions, launch handler, icons,
  screenshots, categories, shortcuts, protocol handlers, related applications, and preference flags.
- Use named schema components and derive `WebManifest` and nested manifest item types from those
  components so the schema becomes the source of truth. Preserve the current public type names and
  runtime utility imports.
- Infer the module options shape from the schema, including icon source options and the typed
  manifest field. Update `src/module.ts` and `src/utils/index.ts` accordingly.
- Remove `src/types/options.ts`; the remaining manifest types should live under runtime types, not
  under a build-time options directory.
- Review the existing `as WebManifest` path in manifest generation and replace it with correctly
  modeled schema/type narrowing if possible; do not add an unapproved assertion merely to satisfy
  the refactor.
- Add focused tests for each manifest collection/object shape, generated defaults, explicit icon
  precedence, and invalid manifest values. Stop for human review after this module.

## Cross-cutting validation checklist

For every module touched:

- search for imports of deleted `src/types/options` or moved domain types;
- inspect generated declarations and runtime package exports;
- preserve `z.input` versus `z.output` semantics and module defaults;
- update public README and matching consumer skill when public types/options move or change;
- add one Changeset per affected public-package concern, with unrelated packages separated;
- run focused tests/typecheck for the module.

After Batch 1 and after each Batch 2 review gate, run the applicable package build and typecheck.
After all modules are complete, run:

```text
corepack pnpm format
corepack pnpm lint:fix
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm validate:packages
```

Because this changes published type ownership and runtime subpaths, also run the packed-consumer
validation required by the workspace contract:

```text
corepack pnpm pack:packages /tmp/nuxt-module-option-types-artifacts
corepack pnpm validate:external-consumer --packages-dir=/tmp/nuxt-module-option-types-artifacts
```

Do not claim the refactor is complete until the packed artefacts confirm that moved runtime types,
schema exports, and public package declarations are consumable outside the workspace.
