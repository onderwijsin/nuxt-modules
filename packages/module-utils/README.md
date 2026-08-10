# @onderwijsin/nuxt-module-utils

Shared utilities for building the Onderwijs in Nuxt modules.

This package exists to keep recurring module concerns in one place: module setup and lifecycle
logging, option validation, typed object helpers, conditional dependency registration, retryable
operations, server-side administrator authentication and request token checks, and primitive runtime
guards. Keeping these contracts shared prevents each module from implementing subtly different
behavior.

## Why is this a published package?

Nuxt Module Builder copies runtime files into a module's output without bundling their package
imports. Modules therefore need to declare runtime utilities as normal dependencies. Publishing this
package allows a module's generated runtime code to resolve its imports in the consuming
application's Vite or Nitro build, including Node.js and Cloudflare Workers targets.

Modules in this repository depend on it through the workspace during development. When published,
pnpm converts the workspace range into a regular npm semver dependency, so application developers
receive it transitively when they install a module.

## Subpaths

Use the narrowest subpath for the code you are writing:

- `@onderwijsin/nuxt-module-utils/shared` contains framework-neutral runtime helpers.
- `@onderwijsin/nuxt-module-utils/build` contains Node-only module setup, option validation, and
  build-time file discovery helpers.
- `@onderwijsin/nuxt-module-utils/server` contains H3-dependent request-token and
  administrator-authentication helpers.
- `@onderwijsin/nuxt-module-utils` is a compatibility alias for the shared exports.

The separate `server` entrypoint keeps H3-specific code out of shared and app-only dependency
graphs. The `app` and `types` exports are reserved for package-level compatibility and type-only
contracts.

Use `moduleDependenciesWhenEnabled` from the `build` subpath to register dependencies according to
the standard module option contract. It returns the dependency map for `undefined`, `{}`, or
`{ enabled: true }`, and `{}` for `false` or `{ enabled: false }`. Module setup must still skip its
runtime registrations when disabled.

This package is primarily a dependency for module authors and published module runtime code. It is
not intended to be an application-level Nuxt module or a package that consumers install directly.

## API reference

For the complete utility list, signatures, behavior, and examples, see the
[module utilities cookbook](https://github.com/onderwijsin/nuxt-modules/blob/main/docs/module-cookbook/module-utils.md)
and
[primitive guards guide](https://github.com/onderwijsin/nuxt-modules/blob/main/docs/module-cookbook/guards.md).
