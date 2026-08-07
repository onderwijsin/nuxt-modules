# Changelog

## 1.0.0

### Major Changes

- 5c1751f: Harden validation and runtime behavior across modules. Turnstile now requires the expected action,
  draft forms support arrays and dates, generated webmanifest icons honor requested formats, and
  health checks have bounded execution with safe public errors. Theme persistence validates stored
  data, and custom color tokens remain unique after mutations. The newsletter endpoint is rate
  limited through nuxt-api-shield, uses bounded provider requests, treats duplicate subscriptions as
  idempotent, and separates its browser and server runtime exports. Device removes the ineffective
  `refreshOnResize` option.

## 0.2.0

### Minor Changes

- 5d6d5aa: Add the provider-independent newsletter signup module with Loops and Mailchimp adapters,
  configurable list and field mappings, and a typed client composable.

### Patch Changes

- 70ff6f1: Refactor module option validation to parse complete module-owned Zod schemas directly, with uniform validation error logging and typed validated options.

## 0.1.0

- Initial newsletter signup endpoint with Loops and Mailchimp adapters.
