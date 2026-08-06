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
