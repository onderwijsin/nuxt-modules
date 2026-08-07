# Migrating local modules to the monorepo

Use this checklist when moving a Nuxt module copied from a consuming application into a publishable
package under `modules/`. Although the module anatomy is largely similar between a local module and
a publishable module, there are distinct differences. The local module might not be fully
encapsulated, include patterns and conventions from the legacy code base, have the wrong setup, or
it's assumptions on how the consuming app will utilize the module is too narrow.

So when migrating the local module to a publishable module in this monorepo, you goal is to:

- Fully encapsulate it
- Make it adhere to all conventions in the module cookbook
- Make it agnostic with regards to the cosnumer

Keep this article living: add a check when a migration finds a recurring app coupling or release
problem.

## Inventory the source module

- [ ] Confirm the public module name, config key, options, auto-imports, components, plugins, pages,
      server handlers, runtime config, and generated types.
- [ ] Search for consumer-specific aliases, app paths, environment variables, imports, and helper
      packages before moving files.
- [ ] Inspect a comparable published module and the relevant cookbook articles first.
- [ ] Record compatibility-sensitive behavior before refactoring it.

## Move into the publishable package shape

- [ ] Use `src/module.ts` as the orchestration-only entrypoint.
- [ ] Put build-time helpers in `src/config/`, consumer runtime code in `src/runtime/`, and public
      types in `src/types/`.
- [ ] Put tests in the package-owned `__tests__/` directory.
- [ ] Add `build.config.ts`, `tsconfig.json`, package scripts, Node engine, repository metadata,
      `CHANGELOG.md`, and a package `README.md`.
- [ ] Add an isolated `playground/` with a private package, `workspace:*` dependency, Nuxt config,
      and `dev`, `typecheck`, and `build` scripts.

## Remove consumer-app coupling

- [ ] Replace app-relative imports and private aliases with package-relative resolver paths or
      public Nuxt aliases.
- [ ] Add explicit imports for Vue, Nuxt, and other runtime dependencies; published runtime files
      must not rely on consumer auto-imports.
- [ ] Keep app-specific content, routes, assets, and configuration as options or documented
      extension points rather than hard-coded paths.
- [ ] Use Nuxt Kit registration utilities (`addImports`, `addImportsDir`, `addComponentsDir`,
      `addPlugin`, `addTemplate`, and `addTypeTemplate`) from the module entrypoint.
- [ ] Register static type templates before enabled guards when `nuxt prepare` must work without
      consumer options.
- [ ] Validate constrained or external option shapes at the module boundary with Zod.
- [ ] Preserve Node server and Cloudflare Workers compatibility.

## Make the package publishable

- [ ] Use the public name `@onderwijsin/nuxt-<module-name>` and export the generated module and
      declarations from `dist/`.
- [ ] Put runtime dependencies in `dependencies`; keep build and test tooling in `devDependencies`.
- [ ] Inline private workspace helpers in the build and verify no private imports leak into the
      packed module.
- [ ] Add or update the module table in the root `README.md`.
- [ ] Add the corresponding installable consumer skill under `skills/<module-name>/` and update it
      when options or public APIs change.
- [ ] Add a Changeset for user-facing package changes.

## Test and verify

- [ ] Test pure utilities directly, including important boundary cases.
- [ ] Test module metadata, defaults, enabled/disabled setup, registrations, generated templates,
      and type templates.
- [ ] Add Nuxt integration coverage only where module loading or generated consumer output matters.
- [ ] Run formatting, lint fixes, typecheck, unit tests, builds, and package metadata validation.
- [ ] Inspect a packed tarball; do not commit `dist/`, `.nuxt/`, `.output/`, coverage, or archives.
