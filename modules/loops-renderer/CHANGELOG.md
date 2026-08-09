# Changelog

## 0.2.5

### Patch Changes

- 132746b: Centralize conditional module dependency registration and apply the shared enablement contract
  consistently across the affected modules.
- Updated dependencies [438e854]
- Updated dependencies [132746b]
  - @onderwijsin/nuxt-module-utils@0.2.0

## 0.2.4

### Patch Changes

- 33bc382: Update module utility imports to the published `@onderwijsin/nuxt-module-utils` package.
- Updated dependencies [33bc382]
  - @onderwijsin/nuxt-module-utils@0.1.0

## 0.2.3

### Patch Changes

- ae69b48: Avoid registering renderer dependencies when the module is disabled.

## 0.2.2

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.
- ec29c96: Update module utils import to runtime dependent namespace
- 8bb6cd7: Added shared module utilities for runtime transpilation, typed object entry conversion, and consistent option validation. Updated consuming modules to use the shared helpers, preserve arbitrary option keys, and remove duplicated setup/validation logic. No public consumer API changes.

## 0.2.1

### Patch Changes

- c39e4bc: Finetune prepare and packaging scripts

## 0.2.0

### Minor Changes

- 0220084: Add the Nuxt presentation layer for rendering parsed Loops LMX ASTs with the `LoopsRenderer` component, safe variable and URL resolution, conditional sections, inline styles, media, layouts, and development diagnostics.

## Unreleased

- Update rendering for the expanded Loops LMX AST, including raw text, Quote,
  Strike, Text, and Br nodes.
- Propagate renderer configuration through recursive node components.
- Resolve dynamic image sources and lazy-load rendered images.
- Add `simple-icons` as a runtime dependency.

## 0.1.0

- Add the initial Loops LMX renderer module boilerplate.
