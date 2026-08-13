# Layered External Consumer Fixture Refactor Plan

## Status

Implemented design. This document records the first implementation without registry fallbacks.

## Objective

Make the external Nuxt consumer composable across CI scopes while preserving the value of a real
package-consumer check.

The consumer must:

- install only the package tarballs produced for the current validation scope;
- activate only the Nuxt layers represented by those local packages;
- run only the assertions supported by the active layers;
- preserve workspace dependency closure;
- validate packed output outside the repository workspace;
- run the complete all-module fixture for full-scope validation.

Registry fallback is explicitly out of scope for the first version.

## Verified dependency model

The change detector already maintains two related package sets:

### Selected validation packages

The selected package set contains:

- directly changed packages;
- transitive workspace dependents;
- the module playground when a module package changes.

This set is emitted as `packages` and is used for focused typechecks and test-path selection.

### Preparation dependency closure

The preparation set starts with the selected package set and adds all transitive workspace
dependencies through the forward dependency graph.

This set is emitted as `prepare_packages` and is used by the focused preparation step.

The current implementation therefore already computes the dependency closure needed by a focused
consumer. The consumer refactor should reuse this existing closure instead of inventing a second
dependency algorithm.

For example, the focused Directus run currently identifies the affected Directus packages and
playgrounds, while its preparation closure also includes shared workspace producers such as
module-utils and turnstile where required.

The distinction matters:

- dependents need validation because they may be affected by the change;
- dependencies need to be built and available because the selected packages consume them.

## Scope behavior

### Light scope

No consumer job runs.

Light changes do not produce package artifacts and do not activate a consumer fixture.

### Focused scope

The focused workflow:

1. detects selected packages and preparation dependencies;
2. prepares the dependency closure;
3. builds the local production artifacts required by the closure;
4. packs the public packages in that closure;
5. uploads a focused package artifact containing a manifest;
6. runs a focused external consumer using those artifacts;
7. activates only layers available in the focused consumer profile;
8. runs only assertions for the active layers.

The focused consumer validates changed packages together with the workspace packages required to
install and execute them. It does not require every repository package.

### Full scope

The full workflow:

1. prepares and builds the complete workspace;
2. packs every public package;
3. uploads the complete package artifact;
4. runs the same external consumer script;
5. activates every available layer;
6. runs the complete assertion set.

The full consumer remains the release-facing integration guardrail.

## Package artifact contract

Extend the package packing flow so it can accept an explicit package selection.

The packer should support two modes:

- default mode: pack every public workspace package;
- focused mode: pack the public package subset represented by the preparation closure.

Private playground packages must never be packed as publishable artifacts.

The generated `manifest.json` should remain the consumer's package source of truth and should
contain at least:

- package name;
- package version;
- archive filename;
- optionally the source scope/profile for diagnostics.

The focused package selection must include:

- selected packages;
- transitive workspace dependencies from `prepare_packages`;
- no unrelated public package merely because it exists in the monorepo.

The packer must fail clearly if a requested public workspace package has no usable production
artifact.

The focused pack operation must happen after the preparation/build work that materializes the
package's final `dist` output. It must not substitute stubs for production artifacts.

## Consumer fixture structure

Refactor the current monolithic fixture into a base application plus local Nuxt layers.

Implemented structure:

```text
integration/external-consumer/
├── fixture/
│   ├── app/
│   ├── server/
│   ├── nuxt.config.ts
│   └── consumer-layers/
│   ├── cache/
│   │   ├── nuxt.config.ts
│   │   ├── app/
│   │   └── server/
│   ├── device/
│   ├── directus-client/
│   ├── directus-config/
│   ├── directus-sitemaps/
│   ├── healthcheck/
│   ├── loops-renderer/
│   ├── newsletter-signup/
│   ├── redirects/
│   ├── sentry-config/
│   ├── simple-rate-limiter/
│   ├── static-text/
│   ├── storage-admin/
│   ├── theme-customizer/
│   ├── turnstile/
│   ├── ui-form-extensions/
│   └── webmanifest/
└── run.mjs
```

Each layer owns the consumer behavior specific to one package:

- module registration;
- module options;
- required runtime configuration;
- server routes and tasks;
- app components or page markers;
- layer-local fixtures;
- a stable layer identifier for assertions.

The base application should contain only shared Nuxt setup and shared presentation. It must not
assume that every repository module exists.

The runner copies the checked-in fixture unchanged into the temporary consumer. The checked-in
`fixture/nuxt.config.ts` reads the generated `consumer-profile.json` and conditionally extends only
the selected directories under `consumer-layers/`. The directory is intentionally not named
`layers/`, because Nuxt auto-discovers every directory with that name before the conditional config
can filter it.

The runner generates only unavoidable consumer metadata: the package manifest, pnpm overrides, and
the selected profile file. Fixture behavior and file ownership remain visible in version control.

## Layer selection

Layer selection must be based on package names, not on whether a tarball happens to be present by
accident.

Discover public module identifiers from the directories under `modules/`. Layer directories are
derived from those identifiers with `getLayerName(module)`, which removes the `@onderwijsin/nuxt-`
prefix. This keeps package identity and layer identity aligned without a second hardcoded module
list.

Discovery does not infer layer configuration or assertions. A new module therefore still requires a
checked-in `consumer-layers/<module-name>/` directory; full validation fails if the discovered
module does not have one.

Selection rules:

1. Read the artifact manifest.
2. Build a set of artifact package names.
3. Select layers whose owning package is present.
4. Ensure required workspace dependencies are present before selecting a layer.
5. Fail with a clear diagnostic if an artifact package has no layer mapping but the consumer profile
   expects it.
6. In full mode, require every registered layer and every public package to be present.

A package can be present as a dependency without being an active layer. For example, module-utils
may be required to install or execute another module but should not be registered in Nuxt as a
consumer module.

## Directus sitemap handling

Remove `@nuxtjs/sitemap` from the fixture's explicit `modules` list.

The Directus sitemaps module already declares `@nuxtjs/sitemap` as a module dependency and mutates
the sitemap configuration. The refactor should verify that Nuxt's module dependency mechanism loads
it correctly when only `@onderwijsin/nuxt-directus-sitemaps` is registered.

Add a focused consumer test for this contract:

- register the Directus sitemaps layer;
- do not explicitly register `@nuxtjs/sitemap`;
- verify Nuxt preparation succeeds;
- verify the Directus sitemap source and expected sitemap behavior are available.

If Nuxt module dependency registration installs but does not activate the dependency, fix the
module's dependency registration or layer setup at the owning boundary. Do not keep the explicit
fixture module entry merely to hide that contract issue.

## Conditional assertions

The current external-consumer script contains global assertions that assume all modules exist.
Replace that structure with layer-owned API and page sanity checks.

Each layer should expose or register a small set of checks. The external-consumer runner should
execute checks based on the active profile.

Preferred pattern:

- each layer contributes a deterministic API endpoint and page;
- the page calls the endpoint and renders `<p :data-sanity="layerName">{{ data }}</p>`;
- the runner executes only checks for active layers;
- shared base checks always run.

Examples:

- healthcheck layer: assert the health endpoint response;
- redirects layer: assert redirect creation and lookup;
- storage-admin layer: assert configured mount visibility;
- webmanifest layer: assert generated manifest;
- newsletter layer: assert validation behavior;
- Directus sitemaps layer: assert the generated sitemap source endpoint;
- runtime-export layer: assert only the runtime exports belonging to active layers.

Avoid importing every module's runtime API from one shared endpoint. Static imports of absent
packages would make a focused consumer fail before conditional checks can run.

The runner exposes both `runFocusedAssertions()` and `runFullAssertions()`. Focused assertions run
for every profile, including full mode, and validate the active profile, every active layer's API,
and every active layer's rendered page. Full assertions run only afterward and add non-overlapping
release guardrails such as healthcheck, sitemap, storage, redirect, theme, and webmanifest behavior.
There is no aggregate `full-sanity` layer.

## Generated package manifest

The generated consumer `package.json` should contain:

- Nuxt;
- any genuinely direct external fixture dependencies;
- one `file:` dependency for every artifact in `manifest.json`.

It should not contain explicit dependencies for packages that are not in the artifact manifest.

The generated `pnpm-workspace.yaml` overrides should be generated from the same artifact manifest
and should only override packages represented by local tarballs.

The first implementation must not add registry fallback entries. If a layer or dependency is missing
from the focused artifact set, the consumer should fail with a clear missing-closure diagnostic
rather than silently installing a published version.

## Workflow changes

### Detection outputs

Reuse the existing detector outputs:

- `packages` for affected validation packages;
- `prepare_packages` for the focused artifact closure;
- `phase_external_consumer` for consumer scheduling.

If the workflow needs a machine-readable list rather than a space-separated shell value, add a JSON
output alongside the existing outputs. Do not parse human-readable summaries.

### Focused quality job

Add focused packaging after the focused preparation/build work:

1. prepare the closure;
2. run focused checks;
3. pack public packages from `prepare_packages`;
4. upload `focused-packages-${{ github.sha }}`.

The pack step should be conditional on the focused external-consumer phase.

### Focused consumer job

Add a focused consumer job that:

- depends on detection and focused quality;
- runs only for focused scope when the external-consumer phase is enabled;
- downloads the focused package artifact;
- runs the layered external consumer;
- does not rebuild unrelated packages.

The job must be wired so a failed focused quality job cannot trigger the consumer.

### Full consumer job

Keep the full consumer job's existing artifact flow, but use the same layered consumer
implementation with the full manifest. Full mode should assert that all public packages and
registered layers are present.

## Tests

Add unit tests for the packing/profile logic:

- selected package names map to the expected public artifact set;
- transitive workspace dependencies are included;
- private playground packages are excluded from tarball output;
- missing requested dependencies fail clearly;
- full mode selects every public package;
- focused mode selects only the preparation closure;
- layer registry entries resolve to existing directories;
- every public consumer package has the expected layer mapping or is explicitly classified as
  non-layer infrastructure;
- no explicit `@nuxtjs/sitemap` module entry is generated.

Add consumer-profile tests:

- no artifacts produces a clear validation error;
- a minimal artifact set activates only its layers;
- inactive layer assertions are skipped;
- active layer assertions run;
- a missing layer dependency fails before Nuxt build;
- full profile activates every layer and all checks.

Add a focused integration fixture using the Directus package closure to prove:

- Directus client/config/sitemaps dependencies are locally packed;
- sitemap is loaded through the Directus sitemaps dependency contract;
- unrelated layers are not activated;
- Directus runtime assertions pass.

## Documentation

Update:

- `docs/ci.md` with focused artifact packaging and layered consumer behavior;
- `docs/actions.md` only if workflow/action permissions or action behavior change;
- `docs/workspace.md` with focused package packing/consumer commands if exposed locally;
- the external consumer fixture documentation or module cookbook references if the fixture becomes a
  documented repository contract.

Document explicitly that:

- focused consumer artifacts are based on the preparation dependency closure;
- selected packages and preparation dependencies are different sets;
- no npm fallback exists in the first version;
- full CI remains the all-package integration profile.

## Validation plan

Run, in order:

1. focused detector tests;
2. packer/profile unit tests;
3. the Directus-focused consumer integration;
4. full consumer validation with all artifacts;
5. actionlint;
6. formatting and lint checks;
7. typecheck;
8. repository tests;
9. package build and packed-consumer checks.

For CI validation, verify at least:

- documentation-only changes skip consumer work;
- a focused package change runs the focused consumer with only its closure;
- a full repository change runs the complete consumer;
- a failed focused quality job does not run the consumer;
- missing artifact closure fails before package installation;
- no consumer dependency is resolved from the npm registry in the first version.

## Risks and mitigations

### Dependency closure drift

Risk: packer and detector compute different closures.

Mitigation: make the focused workflow pass the detector's `prepare_packages` output to the packer
and test the exact Directus graph.

### Accidental registry resolution

Risk: pnpm installs a missing package from npm.

Mitigation: generate only local `file:` dependencies, use frozen lockfile installation after
resolution, and fail on missing artifacts.

### Static imports of inactive modules

Risk: Nuxt or Nitro evaluates an import for a module not present in the focused profile.

Mitigation: move module-specific imports and routes into their own layers.

### Fixture behavior becoming opaque

Risk: generated configuration hides what is being tested.

Mitigation: log the selected artifact package names, active layers, skipped layers, and active
assertion identifiers in the Actions summary.

### Full profile drift

Risk: a new public module is packed but never covered by the full fixture.

Mitigation: validate the layer registry against public package discovery and fail full mode when a
public package lacks an explicit layer or infrastructure classification.

## Implementation order

1. Remove explicit `@nuxtjs/sitemap` registration and prove the module dependency contract.
2. Introduce the layer registry and base/layer fixture structure.
3. Move one small module, such as healthcheck, into a layer.
4. Move the Directus package set into layers and add conditional assertions.
5. Generalize the remaining modules into layers.
6. Add focused package selection and closure-aware packing.
7. Add the focused consumer job.
8. Switch full consumer execution to the layered profile.
9. Add registry validation and documentation.
10. Run full repository and consumer validation.

## Success criteria

The refactor is complete when:

- a focused change produces only its preparation dependency closure as local tarballs;
- the focused consumer activates only layers backed by those tarballs;
- unrelated layers and assertions are skipped;
- the fixture no longer explicitly loads `@nuxtjs/sitemap`;
- no missing package silently falls back to npm;
- full CI still activates and validates every public module;
- the same consumer runner supports both focused and full profiles;
- the selected package list and active layer/assertion list are visible in CI logs.
