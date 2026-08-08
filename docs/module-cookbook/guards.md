# Primitive runtime guards

The guards in `@onderwijsin/nuxt-module-utils/shared` are small predicates for ordinary runtime
control flow and TypeScript narrowing. They are not a schema system, input-validation framework,
replacement for Zod, parsing/coercion layer, or generic collection for every one-off predicate.

## API reference

| Guard              | Signature                                                                                          | Semantics                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `isDefined`        | `isDefined<T>(value: T): value is Exclude<T, undefined>`                                           | Checks only for `undefined`; `null`, `false`, `0`, and `""` are defined.                                           |
| `isRecord`         | `isRecord(value: unknown): value is Record<string, unknown>`                                       | Non-null objects excluding arrays, including null-prototype objects. It does not require a plain-object prototype. |
| `isArray`          | `isArray(value: unknown): value is unknown[]`                                                      | Checks `Array.isArray`.                                                                                            |
| `isString`         | `isString(value: unknown): value is string`                                                        | Checks the string type, including `""`.                                                                            |
| `isNonEmptyString` | `isNonEmptyString(value: unknown): value is string`                                                | Requires one or more characters; whitespace counts.                                                                |
| `isNonBlankString` | `isNonBlankString(value: unknown): value is string`                                                | Requires one or more non-whitespace characters.                                                                    |
| `isNumber`         | `isNumber(value: unknown): value is number`                                                        | Checks the number type; `NaN` and infinities pass.                                                                 |
| `isFiniteNumber`   | `isFiniteNumber(value: unknown): value is number`                                                  | Accepts numbers except `NaN`, `Infinity`, and `-Infinity`.                                                         |
| `isInteger`        | `isInteger(value: unknown): value is number`                                                       | Checks `Number.isInteger`; non-finite values and fractions fail.                                                   |
| `isBoolean`        | `isBoolean(value: unknown): value is boolean`                                                      | Checks the boolean type.                                                                                           |
| `isFunction`       | `isFunction(value: unknown): value is (...args: never[]) => unknown`                               | Checks whether a value is callable.                                                                                |
| `hasKeys`          | `hasKeys(value: Record<string, unknown>): boolean`                                                 | Checks for one or more own enumerable string keys.                                                                 |
| `hasKey`           | `hasKey<Key extends PropertyKey>(value: object, key: Key): value is object & Record<Key, unknown>` | Checks an own property using `Object.hasOwn`, never the prototype chain.                                           |

```ts
if (isRecord(value) && hasKey(value, "statusCode") && isNumber(value.statusCode)) {
  return value.statusCode;
}
```

`isRecord` differs from a stricter local `isPlainObject` predicate. Keep a local plain-object check
when prototypes must be exactly `Object.prototype` or `null`, such as recursive form cloning.

## Design constraints

Each guard answers one small runtime question with literal, explicit semantics. Guards are
dependency-free type predicates: they do not coerce values, report errors, parse input, compose
schemas, or provide broad generic `isEmpty` behavior. Specialized and domain-specific predicates may
remain local.

## When to add a new guard — and when not to

Add a guard to `module-utils/shared` when it represents a small generic runtime property, has
multiple credible workspace usages (or is an obvious primitive counterpart), has stable semantics,
and materially improves readability or narrowing.

Keep it local when it is domain-specific, validates a structured shape, needs parsing/coercion,
diagnostics, options, composition, or context, belongs at an external boundary where Zod is more
appropriate, or has only one specialized use.

> Prefer a shared guard when it gives a common primitive runtime check a clear name. Prefer a local
> predicate or Zod when the check describes application or domain structure.
