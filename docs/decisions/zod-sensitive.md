# Zod sensitivity augmentation

The Directus configuration schemas use `.sensitive()` to identify values that must be removed from
the client-safe `#directus-config` projection. The annotation belongs on the schema that owns the
value, so the public projection remains derived from the complete schema instead of a separate,
easy-to-drift allowlist.

## Why augment Zod

Zod does not provide a domain-specific sensitivity marker. We add one to `ZodType.prototype` so the
marker is available on every Zod schema while preserving the normal schema composition API:

```ts
z.string().sensitive();
```

The method stores `sensitive: true` in Zod metadata and returns the schema with a type-level
`SensitiveSchema` marker. Runtime projection recursively inspects that metadata, while the type
definitions exclude sensitive fields from the derived public output.

The augmentation is installed in `schema/sensitive.ts`:

```ts
declare module "zod" {
  interface ZodType {
    sensitive(): SensitiveSchema<this>;
  }
}

z.ZodType.prototype.sensitive = function sensitive() {
  return this.meta({ ...this.meta(), sensitive: true });
};
```

This is a deliberate runtime prototype augmentation because the method must exist on schemas created
by the installed Zod package, not only in TypeScript's declarations. The module is side-effectful:
importing it installs the method. Therefore every schema file that calls `.sensitive()` must include
an explicit side-effect import:

```ts
// Registers the shared Zod sensitivity method used below.
import "./sensitive";
```

Keeping the import next to each use makes the runtime dependency clear and prevents bundlers from
omitting the augmentation when a schema file is consumed independently.
