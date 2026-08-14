# Working with `@onderwijsin/nuxt-module-utils`

Read this article before adding a new local module helper, importing a shared utility, changing
`packages/module-utils`, or reviewing a module that duplicates module-agnostic behavior. Read
[primitive runtime guards](guards.md) as well when narrowing unknown values.

`packages/module-utils` is the publishable, module-agnostic utility package used by modules in this
repository. It contains build-time Nuxt module helpers, typed object-entry helpers, Zod option
validation, retryable operation helpers, primitive runtime guards, and server-only request-token
checks. It is published as a runtime dependency for modules that use its runtime helpers;
application authors generally should not install or import it directly.

Before implementing a reusable helper, search this reference and the package exports. Prefer an
existing utility when its documented semantics match. Keep specialized or domain-specific logic in
the owning module rather than forcing it into the shared package.

## Runtime subpaths

Use the public package subpaths rather than source paths:

| Subpath                                 | Contents                                   | Intended use                                                                             |
| --------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `@onderwijsin/nuxt-module-utils`        | Compatibility alias for the shared exports | Existing shared-only imports; prefer `@onderwijsin/nuxt-module-utils/shared` in new code |
| `@onderwijsin/nuxt-module-utils/shared` | Framework-neutral runtime helpers          | Runtime code and shared helpers that do not need Node or `h3`                            |
| `@onderwijsin/nuxt-module-utils/build`  | Node-only module setup and build helpers   | Module entrypoints, config, and consumer source discovery                                |
| `@onderwijsin/nuxt-module-utils/server` | H3 request-token helpers                   | Server routes and server utilities only                                                  |
| `@onderwijsin/nuxt-module-utils/app`    | Reserved client-runtime entrypoint         | Do not import; it currently has no public helpers                                        |
| `@onderwijsin/nuxt-module-utils/types`  | Shared TypeScript types                    | Type-only imports such as `BaseModuleOptions`                                            |

The `server` subpath is separate so importing token helpers does not add `h3` to build-time or
app-only dependency graphs. The package root currently re-exports the shared entrypoint for
compatibility, but it must not be used for server helpers. Published modules declare the package as
a normal `workspace:^` runtime dependency. pnpm rewrites that protocol to a semver range when
packing the module for npm, so consumers receive the package transitively.

## Utility reference

The following table lists the public runtime utilities and their import locations. The signatures
use the source-level generic types; type-only exports are listed separately below.

| Utility                          | Calling signature                                                                                                                                                  | Import from                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `attempt`                        | `attempt<T>(operation: () => T \| Promise<T>): Promise<AttemptResult<T>>`                                                                                          | `@onderwijsin/nuxt-module-utils/shared` |
| `attemptWithRetry`               | `attemptWithRetry<T>(operation: () => T \| Promise<T>, options?: AttemptRetryOptions): Promise<AttemptResult<T>>`                                                  | `@onderwijsin/nuxt-module-utils/shared` |
| `toEntries`                      | `toEntries<T extends object>(value: T): [keyof T, T[keyof T]][]`                                                                                                   | `@onderwijsin/nuxt-module-utils/shared` |
| `fromEntries`                    | `fromEntries<K extends PropertyKey, V>(entries: Iterable<readonly [K, V]>): Record<K, V>`                                                                          | `@onderwijsin/nuxt-module-utils/shared` |
| `keys`                           | `keys<T extends object>(object: T): (keyof T)[]`                                                                                                                   | `@onderwijsin/nuxt-module-utils/shared` |
| `resolveModuleName`              | `resolveModuleName(moduleKey: string): string`                                                                                                                     | `@onderwijsin/nuxt-module-utils/build`  |
| `resolveLoggerScope`             | `resolveLoggerScope(moduleKey: string): string`                                                                                                                    | `@onderwijsin/nuxt-module-utils/build`  |
| `isPrepareMode`                  | `isPrepareMode(nuxt: Nuxt): boolean`                                                                                                                               | `@onderwijsin/nuxt-module-utils/build`  |
| `transpileRuntime`               | `transpileRuntime(nuxt: Nuxt, runtimeDir: string): void`                                                                                                           | `@onderwijsin/nuxt-module-utils/build`  |
| `moduleSetup`                    | `moduleSetup<T extends BaseModuleOptions>(moduleName: string, options: T, log: ConsolaInstance): { start: () => void; end: () => void; isEnabled: () => boolean }` | `@onderwijsin/nuxt-module-utils/build`  |
| `moduleDependenciesWhenEnabled`  | `moduleDependenciesWhenEnabled<T extends object>(options: false \| { enabled?: boolean } \| undefined, dependencies: T): T \| Record<string, never>`               | `@onderwijsin/nuxt-module-utils/build`  |
| `validateModuleOptions`          | `validateModuleOptions<S extends ZodType>(options: unknown, schema: S, log: ConsolaInstance): z.output<S>`                                                         | `@onderwijsin/nuxt-module-utils/build`  |
| `useDirectusSetupCache`          | `useDirectusSetupCache(nuxt)` returns the module-setup-scoped cache shared by Directus modules for one Nuxt instance; it is cleared after `modules:done`.          | `@onderwijsin/nuxt-module-utils/build`  |
| `withDirectusSetupCache`         | `withDirectusSetupCache(nuxt, identity, handler)` coalesces and caches one successful setup operation by stable identity.                                          | `@onderwijsin/nuxt-module-utils/build`  |
| `getDirectusSetupHandlerId`      | `getDirectusSetupHandlerId(handler)` returns a process-local identity for a custom setup handler reference.                                                        | `@onderwijsin/nuxt-module-utils/build`  |
| `enabled`                        | Zod schema: `z.boolean().default(true)`                                                                                                                            | `@onderwijsin/nuxt-module-utils/build`  |
| `isDefined`                      | `isDefined<T>(value: T): value is Exclude<T, undefined>`                                                                                                           | `@onderwijsin/nuxt-module-utils/shared` |
| `isRecord`                       | `isRecord(value: unknown): value is Record<string, unknown>`                                                                                                       | `@onderwijsin/nuxt-module-utils/shared` |
| `createDirectusRestClient`       | `createDirectusRestClient<Schema>({ baseUrl, fetch?, accessToken? }): DirectusRestClient<Schema>`                                                                  | `@onderwijsin/nuxt-module-utils/shared` |
| `isArray`                        | `isArray(value: unknown): value is unknown[]`                                                                                                                      | `@onderwijsin/nuxt-module-utils/shared` |
| `isString`                       | `isString(value: unknown): value is string`                                                                                                                        | `@onderwijsin/nuxt-module-utils/shared` |
| `isNonEmptyString`               | `isNonEmptyString(value: unknown): value is string`                                                                                                                | `@onderwijsin/nuxt-module-utils/shared` |
| `isNonBlankString`               | `isNonBlankString(value: unknown): value is string`                                                                                                                | `@onderwijsin/nuxt-module-utils/shared` |
| `isNumber`                       | `isNumber(value: unknown): value is number`                                                                                                                        | `@onderwijsin/nuxt-module-utils/shared` |
| `isFiniteNumber`                 | `isFiniteNumber(value: unknown): value is number`                                                                                                                  | `@onderwijsin/nuxt-module-utils/shared` |
| `isInteger`                      | `isInteger(value: unknown): value is number`                                                                                                                       | `@onderwijsin/nuxt-module-utils/shared` |
| `isBoolean`                      | `isBoolean(value: unknown): value is boolean`                                                                                                                      | `@onderwijsin/nuxt-module-utils/shared` |
| `isFunction`                     | `isFunction(value: unknown): value is (...args: never[]) => unknown`                                                                                               | `@onderwijsin/nuxt-module-utils/shared` |
| `hasKeys`                        | `hasKeys(value: Record<string, unknown>): boolean`                                                                                                                 | `@onderwijsin/nuxt-module-utils/shared` |
| `hasKey`                         | `hasKey<Key extends PropertyKey>(value: object, key: Key): value is object & Record<Key, unknown>`                                                                 | `@onderwijsin/nuxt-module-utils/shared` |
| `hasMatchingRequestToken`        | `hasMatchingRequestToken(event: H3Event, token: string \| undefined, headerName: string): boolean`                                                                 | `@onderwijsin/nuxt-module-utils/server` |
| `isAdmin`                        | `isAdmin(event: H3Event, token: string \| undefined, headerName: string): boolean`                                                                                 | `@onderwijsin/nuxt-module-utils/server` |
| `isDevelopmentAuthBypassEnabled` | `isDevelopmentAuthBypassEnabled(isDevelopment: boolean, devAuthBypass: boolean): boolean`                                                                          | `@onderwijsin/nuxt-module-utils/server` |
| `assertAdminAccess`              | `assertAdminAccess(event: H3Event, options: AdminAuthOptions, isDevelopment: boolean): void`                                                                       | `@onderwijsin/nuxt-module-utils/server` |
| `discoverSourceFiles`            | `discoverSourceFiles(directory: string): string[]`                                                                                                                 | `@onderwijsin/nuxt-module-utils/build`  |
| `instanceSchema`                 | Shared Directus instance schema (`baseUrl`, `staticToken`)                                                                                                         | `@onderwijsin/nuxt-module-utils/build`  |
| `clientSchema`                   | Shared Directus client schema excluding instance credentials                                                                                                       | `@onderwijsin/nuxt-module-utils/build`  |
| `sitemapSchema`                  | Shared Directus sitemap source schema                                                                                                                              | `@onderwijsin/nuxt-module-utils/build`  |

## `discoverSourceFiles`

`discoverSourceFiles` recursively finds JavaScript and TypeScript source files for a consumer-owned
directory during Nuxt module setup. It returns absolute paths in lexicographic order, excludes
declaration files, and returns an empty list when the directory is absent. Use it for generated
registries where discovery order forms an explicit precedence rule; do not import this Node-only
helper from runtime code.

```ts
import { discoverSourceFiles } from "@onderwijsin/nuxt-module-utils/build";

const sources = discoverSourceFiles(resolve(nuxt.options.rootDir, "server/example"));
```

## `attempt`

`attempt` executes a synchronous or asynchronous operation and represents failure as data instead of
throwing immediately. Successful results contain `data` and `error: null`; failed results contain
`data: null` and the captured `error`.

```ts
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

const result = await attempt(() => ofetch<Data>(url));
if (result.error !== null) {
  logger.error(result.error);
  return fallback;
}
return result.data;
```

Inspect the error and rethrow or map it when the failure cannot safely be hidden from the caller.
Use it for fallible local parsing as well as asynchronous operations, for example when a module
needs to treat malformed persisted metadata as absent rather than throw.

## `attemptWithRetry`

`attemptWithRetry` repeats an operation until it succeeds or reaches a bounded retry budget. It
defaults to three total attempts, a 250 millisecond initial delay, and exponential backoff. Set
`exponentialBackoff: false` for a fixed delay. Use it only for idempotent operations with transient
failures.

```ts
import { attemptWithRetry } from "@onderwijsin/nuxt-module-utils/shared";

const result = await attemptWithRetry(() => ofetch<Data>(url), {
  attempts: 3,
  delayMs: 250,
  exponentialBackoff: true
});
```

## `toEntries`

`toEntries` is a typed equivalent of `Object.entries`, preserving the object's key and value types
for iteration or transformation.

```ts
import { toEntries } from "@onderwijsin/nuxt-module-utils/shared";

const entries = toEntries(options);
```

## `fromEntries`

`fromEntries` creates a typed object from an iterable of key/value pairs. Use it with `toEntries`
when transforming option or configuration maps.

```ts
import { fromEntries, toEntries } from "@onderwijsin/nuxt-module-utils/shared";

const optionsByName = fromEntries(toEntries(options));
```

## `keys`

`keys` is a typed equivalent of `Object.keys`, preserving the object's key type for iteration or
lookup.

```ts
import { keys } from "@onderwijsin/nuxt-module-utils/shared";

const optionNames = keys(options);
```

## `resolveModuleName`

`resolveModuleName` converts a module config key into the repository's namespaced package name. For
example, `resolveModuleName("turnstile")` returns `@onderwijsin/nuxt-turnstile`.

```ts
import { resolveModuleName } from "@onderwijsin/nuxt-module-utils/build";

const moduleName = resolveModuleName("turnstile");
```

## `resolveLoggerScope`

`resolveLoggerScope` converts a module key to the kebab-case scope used by Nuxt's logger.

```ts
import { resolveLoggerScope } from "@onderwijsin/nuxt-module-utils/build";

const log = useLogger(resolveLoggerScope("themeCustomizer"));
```

## `isPrepareMode`

`isPrepareMode` reports whether Nuxt is preparing a project. Use it when setup work must distinguish
Nuxt preparation from a normal module load.

```ts
import { isPrepareMode } from "@onderwijsin/nuxt-module-utils/build";

if (isPrepareMode(nuxt)) return;
```

## `transpileRuntime`

`transpileRuntime` adds a module's runtime directory to Nuxt's transpilation list. Call it for
modules that publish runtime code consumed by Nuxt.

```ts
import { transpileRuntime } from "@onderwijsin/nuxt-module-utils/build";

transpileRuntime(nuxt, runtimeDir);
```

## `moduleSetup`

`moduleSetup` provides consistent lifecycle logging and an enabled check for a Nuxt module. Its
returned `start` and `end` functions log loading state; `isEnabled` logs and returns `false` when
`options.enabled === false`.

```ts
import { moduleSetup } from "@onderwijsin/nuxt-module-utils/build";

const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);
start();
if (!isEnabled()) return;
// Register the module.
end();
```

## `moduleDependenciesWhenEnabled`

Use `moduleDependenciesWhenEnabled` when a module's `moduleDependencies` must follow the shared
`false | { enabled?: boolean } | undefined` option contract. It returns the supplied dependency map
for omitted or enabled options and an empty map for `false` or `{ enabled: false }`.

```ts
import { moduleDependenciesWhenEnabled } from "@onderwijsin/nuxt-module-utils/build";

moduleDependencies: (nuxt) =>
  moduleDependenciesWhenEnabled(nuxt.options.example, {
    "@nuxt/ui": { version: ">=4.0.0" }
  });
```

Keep the helper focused on dependency composition; module setup should still perform its own enabled
check and skip runtime registration when disabled.

## `validateModuleOptions`

`validateModuleOptions` parses complete module options with a supplied Zod schema. It returns the
schema output, logs a formatted validation error, and throws a uniform error when parsing fails. It
does not extend or modify the schema.

```ts
import { validateModuleOptions } from "@onderwijsin/nuxt-module-utils/build";
import { turnstileOptionsSchema } from "./config/options.schema";

const options = validateModuleOptions(rawOptions, turnstileOptionsSchema, log);
```

Define the complete module schema, including the shared `enabled` field, in
`src/config/options.schema.ts`.

## `enabled`

`enabled` is the shared Zod schema for modules whose enabled option defaults to `true`. Compose it
into the module's own schema rather than defining a second enabled default.

```ts
import { enabled } from "@onderwijsin/nuxt-module-utils/build";

const schema = z.object({ enabled, otherOption: z.string() });
```

## Primitive runtime guards

These guards answer small runtime questions without coercion or diagnostics. `isRecord` excludes
`null` and arrays; the string guards distinguish type, length, and whitespace. `isNumber` accepts
`NaN` and infinities while `isFiniteNumber` and `isInteger` provide stronger checks. `isDefined`
removes only `undefined`; `hasKeys` checks own enumerable string keys and `hasKey` checks one own
property. Use them together when narrowing unknown network or persisted data; for example, the
simple-rate-limiter playground uses `isRecord`, `hasKey`, `isNumber`, and `isString` to interpret
fetch errors without unsafe casts. See [the primitive guards guide](./guards.md) for complete edge
cases and design rules.

## `hasMatchingRequestToken`

`hasMatchingRequestToken` checks a configured token in a named request header or in
`Authorization: Bearer <token>`. It returns `false` for missing or empty configured tokens.

```ts
import { hasMatchingRequestToken } from "@onderwijsin/nuxt-module-utils/server";

if (hasMatchingRequestToken(event, runtimeConfig.module.token, "x-module-token")) return;
```

## `isAdmin`

`isAdmin` is the administrator-specific name for the same header-or-bearer token check. Use it for
trusted bypasses in server-facing modules. Keep the expected token in private runtime configuration;
never expose it through `runtimeConfig.public`, logs, client bundles, or hard-coded aliases.

```ts
import { isAdmin } from "@onderwijsin/nuxt-module-utils/server";

if (isAdmin(event, runtimeConfig.module.adminToken, runtimeConfig.module.adminHeaderName)) return;
```

## Shared types and module integration

The package also exports `AttemptResult` and `AttemptRetryOptions` from
`@onderwijsin/nuxt-module-utils/shared`, and `BaseModuleOptions` from
`@onderwijsin/nuxt-module-utils/build` or `@onderwijsin/nuxt-module-utils/types`. Use type-only
imports for these contracts. Declare `@onderwijsin/nuxt-module-utils` as a `workspace:^` runtime
dependency, and inspect the generated bundle or tarball to ensure the package resolves correctly.
Never import `test-utils` from published runtime code.
