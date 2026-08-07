# Working with `module-utils`

`packages/module-utils` is the private package for reusable, module-agnostic helpers: module naming,
logger scopes, prepare-mode detection, setup lifecycle behavior, and option validation. Keep
module-specific behavior in its owning module; promote code only after it is genuinely reusable.

Use its public subpath exports, not source paths. Module entrypoints should import
`resolveModuleName`, `resolveLoggerScope`, `moduleSetup`, and, where validation is needed,
`validateModuleOptions` from `module-utils/shared`:

The source layout mirrors these boundaries: `src/shared/`, `src/server/`, and the reserved
`src/app/` directory each expose an `index.ts` entrypoint.

```ts
import {
  moduleSetup,
  resolveLoggerScope,
  resolveModuleName,
  transpileRuntime,
  validateModuleOptions
} from "module-utils/shared";
```

When a module registers published runtime code, add its runtime directory to Nuxt's transpilation
list with `transpileRuntime(nuxt, runtimeDir)`. This keeps the registration consistent across
modules; it is only needed for modules that ship a runtime directory consumed by Nuxt.

Server-only token helpers come from `module-utils/server`:

```ts
import { isAdmin } from "module-utils/server";
```

## Attempted operations and retries

Use `attempt` in module runtime code when an expected operation failure should be represented as
data rather than thrown immediately:

```ts
import { attempt } from "module-utils/shared";

const result = await attempt(() => ofetch<Data>(url));
if (result.error !== null) {
  logger.error(result.error);
  return fallback;
}

return result.data;
```

The result is a discriminated union: successful operations have `data` and `error: null`, while
failed operations have `data: null` and the captured `error`. This also handles synchronous throws
from the operation. Do not use `attempt` to silently discard failures that must remain visible to a
caller; rethrow or map the error after inspecting the result.

For idempotent work that is safe to repeat, use `attemptWithRetry` with bounded exponential backoff:

```ts
import { attemptWithRetry } from "module-utils/shared";

const result = await attemptWithRetry(() => ofetch<Data>(url), {
  attempts: 3,
  delayMs: 250,
  exponentialBackoff: true
});
```

`attempts` is the total operation count, defaulting to `3`. `delayMs` is the initial delay before a
retry, defaulting to `250` milliseconds. `exponentialBackoff` defaults to `true` and doubles each
subsequent delay; set it to `false` for a fixed delay. The final result preserves the successful
value or the last captured error. Only retry operations that are idempotent and whose failure is
transient.

These helpers are private repository utilities bundled into modules at build time. Never reference
`module-utils`, `attempt`, or `attemptWithRetry` in consumer-facing READMEs, installable skills, or
copyable application examples: consuming apps do not have access to this private package.

The package root is retained as a shared-only compatibility alias. Do not use it for server helpers,
because importing server helpers would make `h3` part of otherwise build-time or app-only dependency
graphs. The reserved `module-utils/app` entrypoint is intentionally empty until client-runtime
helpers are needed.

Define constrained option fields as a plain Zod object in the module's
`src/config/options.schema.ts`; the helper adds the shared `enabled` field. Do not introduce a
schema just for optional TypeScript types.

Declare `module-utils` as a `workspace:*` build dependency. It bundles its own runtime graph with
tsup; consuming modules must explicitly inline it in `build.config.ts` so packed modules contain no
private import:

```ts
export default defineBuildConfig({
  rollup: { inlineDependencies: ["module-utils"] }
});
```

Build `module-utils` before consuming modules and inspect `dist/module.mjs` or the tarball after a
build. Its tests live in `packages/module-utils/__tests__/`. Never import `test-utils` from
published runtime code.

## Shared admin-token bypass

Server-facing modules that need a trusted-service bypass should use the shared request-token helpers
instead of copying application-specific authorization code. Export `hasMatchingRequestToken` for a
generic token check and `isAdmin` when the token represents an administrator credential:

```ts
import { isAdmin } from "module-utils/server";

if (isAdmin(event, runtimeConfig.module.adminToken, runtimeConfig.module.adminHeaderName)) {
  return;
}
```

Both helpers accept either the configured header or `Authorization: Bearer <token>`. A module using
this pattern should expose both values as options, default the header name to a documented stable
value, and store the token only in private runtime configuration. Never place the bypass token in
`runtimeConfig.public`, logs, client bundles, or a hard-coded consumer alias.
