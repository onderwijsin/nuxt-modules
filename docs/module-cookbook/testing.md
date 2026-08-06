# Testing modules

Keep tests package-owned in `__tests__/` and use Vitest for focused unit tests. Test pure utilities
directly; test module entrypoints through observable metadata, dependencies, registrations,
enabled/disabled behavior, and option normalization or validation.

Use `@nuxt/test-utils` only when correctness depends on a real Nuxt app: module loading, generated
configuration, auto-imports, component registration, runtime plugins, or application output. Keep
fixtures inside the module package. Test consumer-visible behavior and important regressions, not
coverage for its own sake.

See the dedicated [testing guide](../testing.md) for test utilities, detailed patterns, locations,
and commands.
