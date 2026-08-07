# Working with `module-utils`

`packages/module-utils` is a private, module-agnostic utility package used by modules in this
repository. It contains build-time Nuxt module helpers, typed object-entry helpers, Zod option
validation, retryable operation helpers, and server-only request-token checks. It is bundled into
consuming modules at build time; application authors must not import it directly.

## Runtime subpaths

Use the public package subpaths rather than source paths:

| Subpath               | Contents                                   | Intended use                                                           |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| `module-utils`        | Compatibility alias for the shared exports | Existing shared-only imports; prefer `module-utils/shared` in new code |
| `module-utils/shared` | Build-time and framework-neutral helpers   | Module entrypoints, config, and runtime code that does not need `h3`   |
| `module-utils/server` | H3 request-token helpers                   | Server routes and server utilities only                                |
| `module-utils/app`    | Reserved client-runtime entrypoint         | Do not import; it currently has no public helpers                      |
| `module-utils/types`  | Shared TypeScript types                    | Type-only imports such as `BaseModuleOptions`                          |

The `server` subpath is separate so importing token helpers does not add `h3` to build-time or
app-only dependency graphs. The package root currently re-exports the shared entrypoint for
compatibility, but it must not be used for server helpers. `module-utils` is private and should be
inlined by each published module's build configuration:

```ts
export default defineBuildConfig({
  rollup: { inlineDependencies: ["module-utils"] }
});
```

Nuxt Module Builder copies `src/runtime` files without bundling their dependencies. Modules with
runtime imports must run `inlineModuleUtilsRuntime` in their `mkdist:done` build hook; it copies the
utility output into `dist/runtime/module-utils` and rewrites those runtime imports to the bundled
copy. Run `pnpm validate:packages` after building packages to catch a private import that reaches
`dist/`.

## Utility reference

The following table lists the public runtime utilities and their import locations. The signatures
use the source-level generic types; type-only exports are listed separately below.

| Utility                   | Calling signature                                                                                                                                                  | Import from           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `attempt`                 | `attempt<T>(operation: () => T \| Promise<T>): Promise<AttemptResult<T>>`                                                                                          | `module-utils/shared` |
| `attemptWithRetry`        | `attemptWithRetry<T>(operation: () => T \| Promise<T>, options?: AttemptRetryOptions): Promise<AttemptResult<T>>`                                                  | `module-utils/shared` |
| `toEntries`               | `toEntries<T extends object>(value: T): [keyof T, T[keyof T]][]`                                                                                                   | `module-utils/shared` |
| `fromEntries`             | `fromEntries<K extends PropertyKey, V>(entries: Iterable<readonly [K, V]>): Record<K, V>`                                                                          | `module-utils/shared` |
| `resolveModuleName`       | `resolveModuleName(moduleKey: string): string`                                                                                                                     | `module-utils/shared` |
| `resolveLoggerScope`      | `resolveLoggerScope(moduleKey: string): string`                                                                                                                    | `module-utils/shared` |
| `isPrepareMode`           | `isPrepareMode(nuxt: Nuxt): boolean`                                                                                                                               | `module-utils/shared` |
| `transpileRuntime`        | `transpileRuntime(nuxt: Nuxt, runtimeDir: string): void`                                                                                                           | `module-utils/shared` |
| `moduleSetup`             | `moduleSetup<T extends BaseModuleOptions>(moduleName: string, options: T, log: ConsolaInstance): { start: () => void; end: () => void; isEnabled: () => boolean }` | `module-utils/shared` |
| `validateModuleOptions`   | `validateModuleOptions<S extends ZodType>(options: unknown, schema: S, log: ConsolaInstance): z.output<S>`                                                         | `module-utils/shared` |
| `enabled`                 | Zod schema: `z.boolean().default(true)`                                                                                                                            | `module-utils/shared` |
| `hasMatchingRequestToken` | `hasMatchingRequestToken(event: H3Event, token: string \| undefined, headerName: string): boolean`                                                                 | `module-utils/server` |
| `isAdmin`                 | `isAdmin(event: H3Event, token: string \| undefined, headerName: string): boolean`                                                                                 | `module-utils/server` |

## `attempt`

`attempt` executes a synchronous or asynchronous operation and represents failure as data instead of
throwing immediately. Successful results contain `data` and `error: null`; failed results contain
`data: null` and the captured `error`.

```ts
import { attempt } from "module-utils/shared";

const result = await attempt(() => ofetch<Data>(url));
if (result.error !== null) {
  logger.error(result.error);
  return fallback;
}
return result.data;
```

Inspect the error and rethrow or map it when the failure cannot safely be hidden from the caller.

## `attemptWithRetry`

`attemptWithRetry` repeats an operation until it succeeds or reaches a bounded retry budget. It
defaults to three total attempts, a 250 millisecond initial delay, and exponential backoff. Set
`exponentialBackoff: false` for a fixed delay. Use it only for idempotent operations with transient
failures.

```ts
import { attemptWithRetry } from "module-utils/shared";

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
import { toEntries } from "module-utils/shared";

const entries = toEntries(options);
```

## `fromEntries`

`fromEntries` creates a typed object from an iterable of key/value pairs. Use it with `toEntries`
when transforming option or configuration maps.

```ts
import { fromEntries, toEntries } from "module-utils/shared";

const optionsByName = fromEntries(toEntries(options));
```

## `resolveModuleName`

`resolveModuleName` converts a module config key into the repository's namespaced package name. For
example, `resolveModuleName("turnstile")` returns `@onderwijsin/nuxt-turnstile`.

```ts
import { resolveModuleName } from "module-utils/shared";

const moduleName = resolveModuleName("turnstile");
```

## `resolveLoggerScope`

`resolveLoggerScope` converts a module key to the kebab-case scope used by Nuxt's logger.

```ts
import { resolveLoggerScope } from "module-utils/shared";

const log = useLogger(resolveLoggerScope("themeCustomizer"));
```

## `isPrepareMode`

`isPrepareMode` reports whether Nuxt is preparing a project. Use it when setup work must distinguish
Nuxt preparation from a normal module load.

```ts
import { isPrepareMode } from "module-utils/shared";

if (isPrepareMode(nuxt)) return;
```

## `transpileRuntime`

`transpileRuntime` adds a module's runtime directory to Nuxt's transpilation list. Call it for
modules that publish runtime code consumed by Nuxt.

```ts
import { transpileRuntime } from "module-utils/shared";

transpileRuntime(nuxt, runtimeDir);
```

## `moduleSetup`

`moduleSetup` provides consistent lifecycle logging and an enabled check for a module. Its returned
`start` and `end` functions log loading state; `isEnabled` logs and returns `false` when
`options.enabled === false`.

```ts
import { moduleSetup } from "module-utils/shared";

const { start, end, isEnabled } = moduleSetup(MODULE_NAME, options, log);
start();
if (!isEnabled()) return;
// Register the module.
end();
```

## `validateModuleOptions`

`validateModuleOptions` parses complete module options with a supplied Zod schema. It returns the
schema output, logs a formatted validation error, and throws a uniform error when parsing fails. It
does not extend or modify the schema.

```ts
import { validateModuleOptions } from "module-utils/shared";
import { turnstileOptionsSchema } from "./config/options.schema";

const options = validateModuleOptions(rawOptions, turnstileOptionsSchema, log);
```

Define the complete module schema, including the shared `enabled` field, in
`src/config/options.schema.ts`.

## `enabled`

`enabled` is the shared Zod schema for modules whose enabled option defaults to `true`. Compose it
into the module's own schema rather than defining a second enabled default.

```ts
import { enabled } from "module-utils/shared";

const schema = z.object({ enabled, otherOption: z.string() });
```

## `hasMatchingRequestToken`

`hasMatchingRequestToken` checks a configured token in a named request header or in
`Authorization: Bearer <token>`. It returns `false` for missing or empty configured tokens.

```ts
import { hasMatchingRequestToken } from "module-utils/server";

if (hasMatchingRequestToken(event, runtimeConfig.module.token, "x-module-token")) return;
```

## `isAdmin`

`isAdmin` is the administrator-specific name for the same header-or-bearer token check. Use it for
trusted bypasses in server-facing modules. Keep the expected token in private runtime configuration;
never expose it through `runtimeConfig.public`, logs, client bundles, or hard-coded aliases.

```ts
import { isAdmin } from "module-utils/server";

if (isAdmin(event, runtimeConfig.module.adminToken, runtimeConfig.module.adminHeaderName)) return;
```

## Shared types and module integration

The package also exports `AttemptResult` and `AttemptRetryOptions` from `module-utils/shared`, and
`BaseModuleOptions` from `module-utils/shared` or `module-utils/types`. Use type-only imports for
these contracts. Declare `module-utils` as a `workspace:*` build dependency, build it before
consuming modules, and inspect the generated bundle or tarball to ensure no private import remains.
Never import `test-utils` from published runtime code.
