# Testing modules

Read this article for any module test, fixture, or test-strategy change, then read the detailed
[testing guide](../testing.md) for repository-wide patterns, locations, and commands.

Keep tests package-owned in `__tests__/` and use Vitest for focused unit tests. Test pure utilities
directly; test module entrypoints through observable metadata, dependencies, registrations,
enabled/disabled behavior, and option normalization or validation.

Use `@nuxt/test-utils` only when correctness depends on a real Nuxt app: module loading, generated
configuration, auto-imports, component registration, runtime plugins, or application output. Keep
fixtures inside the module package. Test consumer-visible behavior and important regressions, not
coverage for its own sake.

Shared test infrastructure belongs in the private [`test-utils` package](test-utils.md). Use its
fixture and H3-event helpers when they apply, and keep module-specific test behavior local.
