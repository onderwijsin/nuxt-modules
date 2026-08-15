---
name: nuxt-module-utils
description: Use when creating, changing, reviewing, testing, or documenting any Nuxt module in this repository. Route module work through the repository utility docs and enforce the shared @onderwijsin/nuxt-module-utils patterns, especially attempt, typed object helpers, and primitive guards.
---

# Nuxt Module Utils

Use this skill for every module task, regardless of whether the change appears to need a shared
utility. Its purpose is to make shared utilities the first design check rather than an afterthought.

## Route before editing

Read these sources before making a module decision:

1. [`AGENTS.md`](../../../AGENTS.md) and [`docs/agent-workflow.md`](../../../docs/agent-workflow.md).
2. [`module-utils.md`](../../../docs/module-cookbook/module-utils.md) for the complete API and
   subpath contract.
3. [`guards.md`](../../../docs/module-cookbook/guards.md) when narrowing unknown values.
4. The other cookbook articles selected by the task, starting at
   [`module-cookbook/index.md`](../../../docs/module-cookbook/index.md).

Inspect the owning module, its tests, and one comparable module. Before adding a local helper,
search the shared utility exports and the cookbook. Finish by checking whether changes to
`packages/module-utils` require synchronized cookbook documentation, exports, tests, and the
`nuxt-module-utils` maintainer skill.

## Shared-first patterns

Import from public subpaths, never from `packages/module-utils/src`:

- `/shared` for framework-neutral runtime helpers and guards.
- `/build` for Node-only module setup, configuration, discovery, and validation.
- `/server` for H3 request-token helpers.
- `/types` for type-only shared contracts.

Keep runtime dependency boundaries explicit. A module that uses a module utility declares
`@onderwijsin/nuxt-module-utils` as a normal runtime dependency; published runtime code never
imports `test-utils`.

### Fallible work: use `attempt`

Represent an operation that may fail as data, then choose the caller-visible failure policy:

```ts
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

const result = await attempt(() => ofetch<Data>(url));
if (result.error !== null) {
  logger.error(result.error);
  return fallback;
}
return result.data;
```

Use `attemptWithRetry` only for idempotent operations with a bounded transient-failure budget.
Rethrow or map `result.error` when a failure cannot safely become a fallback.

Use these patterns consistently:

| Prefer | Instead of |
| --- | --- |
| `attempt(() => operation())` and an explicit `result.error` branch | a local `try/catch` around ordinary fallible work |
| `attemptSync(() => operation())` for synchronous fallible work | duplicating result-capture logic |
| `attemptWithRetry` for bounded retries of idempotent work | unbounded retry loops |

`try/catch` remains appropriate when implementing a low-level boundary whose contract requires
catching synchronously, but module code consuming a fallible operation should use `attempt`.

### Unknown values: use shared guards

Import the matching guard and let its type predicate narrow the value:

```ts
import { hasKey, isRecord, isString } from "@onderwijsin/nuxt-module-utils/shared";

if (isRecord(value) && hasKey(value, "message") && isString(value.message)) {
  return value.message;
}
```

Use `isNonEmptyString` or `isNonBlankString` when length or whitespace semantics matter. Compose
guards for a generic primitive shape; use Zod for complex or structured schema validation. Guards
are not a schema system, input-validation framework, parsing/coercion layer, or replacement for
Zod. At an external boundary, use Zod when validation needs structured validation, parsing or
coercion, composition, or diagnostics; use a local predicate only for a genuinely domain-specific
shape.

| Prefer | Instead of |
| --- | --- |
| `isString(value)` | `typeof value === "string"` |
| `isNumber(value)`, `isFiniteNumber(value)`, or `isInteger(value)` | repeated number checks with inconsistent semantics |
| `isRecord(value)` and `hasKey(value, key)` | unsafe property access or prototype-chain checks |
| `isArray(value)` | `Array.isArray(value)` in module logic |
| `isDefined(value)` | `value !== undefined` when the shared narrowing contract is intended |

Guards do not coerce, parse, log, or validate structured schemas. Preserve that boundary rather
than creating a local alias that merely renames a shared guard.

### Typed object transformations

Use `keys`, `toEntries`, and `fromEntries` when iterating or transforming typed configuration maps:

```ts
import { fromEntries, toEntries } from "@onderwijsin/nuxt-module-utils/shared";

const normalized = fromEntries(toEntries(options).map(([key, value]) => [key, normalize(value)]));
```

Keep module-specific normalization and policy in the owning module; the shared helper supplies the
typed collection operation.

## Completion checklist

Before handoff, confirm every item:

- The routed docs were read and the relevant public utility subpath is used.
- A shared utility was reused wherever its documented semantics match; any local exception has a
  domain-specific reason.
- Fallible operations use the `attempt` result contract and retries are bounded and idempotent.
- Unknown primitive values use the shared guards, with Zod at structured external boundaries.
- No source-path imports, client imports of `/server`, or runtime imports of `test-utils` were added.
- If `packages/module-utils` changed, its tests, public exports, cookbook references, and this
  maintainer skill are synchronized.
- The full diff and applicable repository validation were reviewed.
