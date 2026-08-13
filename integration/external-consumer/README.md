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
