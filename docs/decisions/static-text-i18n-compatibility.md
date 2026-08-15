# Decision: Keep static text compatible with Vue I18n call sites

- **Status:** Accepted
- **Date:** 2026-08-11
- **Scope:** Static-text translation API and i18n coexistence

## Context

The static-text module serves applications with one build-time dictionary, while consumers may later
need Vue I18n or Nuxt I18n. Its narrow API should preserve familiar call sites without implying
feature parity or supporting two translation owners simultaneously.

## Decision

The module exposes `$t` in templates and typed `useText` in application code. Both follow the Vue
I18n-shaped key-plus-optional-named-parameters signature and return a string. The module
intentionally omits locale selection, runtime message loading, pluralization, and ICU syntax.

The module owns `$t` and therefore cannot run alongside Vue I18n or Nuxt I18n. Applications
requiring multiple locales or advanced formatting should use the official internationalization
stack.

## Alternatives considered

- A custom translation API: rejected because familiar Vue I18n call sites ease future migration.
- Implementing full internationalization: rejected because the module is a build-time static-text
  utility, not an i18n replacement.
- Coexisting with another `$t` owner: rejected because duplicate public injection ownership is
  ambiguous.

## Consequences

Consumers get a small, migration-friendly API, but no locale or advanced message features. The
key-and-parameters signature and string return value are compatibility commitments; enhancements
must preserve them.

## Reconsideration criteria

Revisit this decision if the module's scope expands to multiple locales or if Nuxt establishes a
supported way for multiple translation providers to coexist.
