# External consumer

This fixture validates the packed Nuxt modules from outside the workspace. The runner installs the
tarballs in the supplied package manifest and rejects incomplete internal workspace dependency
closures instead of silently taking another `@onderwijsin/nuxt-*` package from the npm registry.
Third-party dependencies are resolved normally by pnpm.

Each module discovered under `modules/` needs a matching `fixture/consumer-layers/<module-name>/`
layer with a Nuxt config, API sanity endpoint, and page sanity check. The focused profile checks
every active layer through both API and rendered HTML. A full profile adds release-level checks such
as health, redirects, and webmanifest behavior.

Run the contract tests with `pnpm exec vitest run integration/external-consumer/__tests__`. To run
the packed consumer locally, first build and pack the workspace, then use
`pnpm validate:external-consumer --packages-dir=/path/to/artifacts`.

For Sentry compatibility checks, include the Sentry config module and its internal dependency
closure in the artifact set. The normal run explicitly installs its catalog-pinned SDK peer. Repeat
with `--sentry-sdk-version=10.78.0` to check a different exact SDK without changing the workspace
catalog. The Sentry layer uses a local transport, checks one initialization and one error event per
capture, verifies the v10 privacy/logging defaults and consumer-owned payload redaction, and
typechecks consumer configuration against the chosen SDK.

Theme customizer runs without a VueUse Nuxt integration by default. Repeat its focused packed
consumer with `--vueuse-nuxt-version=14.4.0` and `--vueuse-nuxt-version=15.0.0` to check
application-owned integrations. These runs prepare and typecheck the published picker/editor
runtime, build the application, and serve the editor and picker fixture. The module keeps
`@vueuse/core` as an isolated utility dependency; it does not register the application's
`@vueuse/nuxt`.

The theme profile uses the workspace's Vue Router version for Nuxt's generated Volar plugin.

When Module Utils is packed, the runner typechecks and executes its package-owned consumer fixture
against the application's Zod and Nuxt Kit logger. This checks inferred transformed/defaulted
options, composition with the exported `enabled` schema, and existing lifecycle, disabled, and error
behavior. The normal profile installs the catalog-pinned Zod peer. Repeat a focused Module Utils
artifact set with `--module-utils-compatibility` to check Nuxt / Nuxt Kit 4.6.2 and Zod 4.6.7
without applying the workspace's dependency overrides.
