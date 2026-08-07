# Working with `module-utils`

`packages/module-utils` is the private package for reusable, module-agnostic helpers: module naming,
logger scopes, prepare-mode detection, setup lifecycle behavior, and option validation. Keep
module-specific behavior in its owning module; promote code only after it is genuinely reusable.

Use its public exports, not source paths. A typical setup uses `resolveModuleName`,
`resolveLoggerScope`, `moduleSetup`, and, where validation is needed, `validateModuleOptions`.
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
import { isAdmin } from "module-utils";

if (isAdmin(event, runtimeConfig.module.adminToken, runtimeConfig.module.adminHeaderName)) {
  return;
}
```

Both helpers accept either the configured header or `Authorization: Bearer <token>`. A module using
this pattern should expose both values as options, default the header name to a documented stable
value, and store the token only in private runtime configuration. Never place the bypass token in
`runtimeConfig.public`, logs, client bundles, or a hard-coded consumer alias.
