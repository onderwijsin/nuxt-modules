# Changelog

## 0.2.4

### Patch Changes

- ae69b48: Preserve edits made while a draft save is in flight and ignore concurrent submissions.

## 0.2.3

### Patch Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

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

- c7ad516: Introduce the Nuxt UI form extensions module with `useDraftForm`, providing
  isolated editable drafts, nested dirty-state tracking, source synchronization,
  submission state, and failed-save handling for Nuxt 4 applications.

## 0.1.0

- Add the initial Nuxt UI form extensions module boilerplate.
