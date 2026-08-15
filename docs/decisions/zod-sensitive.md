# Decision: Mark sensitive Zod fields at their owning schema

- **Status:** Accepted
- **Date:** 2026-08-12
- **Scope:** Sensitive-field metadata and public Directus configuration projection

## Context

Directus configuration contains secrets and server-only values that must not enter the client-safe
`#directus-config` projection. A separate allowlist would drift as schemas evolve, while Zod has no
domain-specific sensitivity marker.

## Decision

The repository augments Zod with a `.sensitive()` method that stores `sensitive: true` in schema
metadata and returns a type-level `SensitiveSchema` marker. Runtime projection recursively inspects
that metadata, and type definitions exclude sensitive fields from public output.

The augmentation is installed by the side-effectful `schema/sensitive.ts` module. Every schema file
that calls `.sensitive()` must explicitly import that module so the runtime method is installed and
bundlers cannot omit it.

## Alternatives considered

- A manually maintained sensitive-field allowlist: rejected because it can drift from the owning
  schema.
- A separate schema for public configuration: rejected because it duplicates the source contract.
- Type-only augmentation: rejected because the method must exist at runtime on schemas from the
  installed Zod package.

## Consequences

Sensitive ownership stays close to the field definition, and public configuration is derived from
the complete schema. The runtime prototype augmentation is intentionally side-effectful, so imports
are required and independent schema consumers must account for that runtime dependency.

## Reconsideration criteria

Revisit this decision if Zod provides an official sensitivity metadata API, or if the public
projection needs a trust model that cannot be expressed by field-level metadata.
