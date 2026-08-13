# Nuxt module cookbook

This cookbook is the authoritative maintainer contract for publishable and local Nuxt modules in
this repository. Start here for module work, then read every article selected by the task. Nearby
implementations remain evidence for conventions the cookbook does not yet cover.

## Choose the relevant articles

| Work being performed                                                                                      | Read                                                                                                  |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Create a publishable module or change package layout/exports                                              | [Package anatomy](package-anatomy.md)                                                                 |
| Migrate a local application module into the monorepo                                                      | [Migration checklist](migrating-local-modules.md), then all rows touched by the migration             |
| Change `src/module.ts`, options, registration, runtime config, templates, generated types, or runtime CSS | [Module entrypoint](module-entrypoint.md) and [patterns and conventions](patterns-and-conventions.md) |
| Use or change `@onderwijsin/nuxt-module-utils`                                                            | [Module utilities](module-utils.md); also [primitive guards](guards.md) when narrowing runtime values |
| Use or change shared test helpers                                                                         | [Test utilities](test-utils.md)                                                                       |
| Add or change module tests and fixtures                                                                   | [Module testing](testing.md) and the detailed [testing guide](../testing.md)                          |
| Add or change a playground                                                                                | [Playgrounds](playground.md)                                                                          |
| Change public options, exports, components, auto-imports, compatibility, or behavior                      | [Documentation and consumer skills](documentation-and-skills.md)                                      |
| Make a Nuxt- or Nuxt Kit-specific design decision                                                         | [Official Nuxt documentation](official-nuxt-documentation.md) and the relevant official reference     |

Multiple rows normally apply. Read selected articles completely before implementation rather than
searching for a single phrase and missing surrounding constraints.

## Apply the cookbook

1. Trace the affected contract from module options and setup through runtime behavior, generated or
   emitted output, tests, playground, package metadata, and consumer documentation.
2. Inspect the affected module and one comparable module before introducing a pattern.
3. Treat documented requirements as contracts. Treat nearby implementations as additional evidence,
   not as permission to contradict the cookbook.
4. If a module legitimately needs a different pattern, document the reason. When the pattern is
   reusable, update the appropriate cookbook article in the same change.
5. Use [`../agent-workflow.md`](../agent-workflow.md) for impact decisions, validation, and handoff.

## Feature decisions

Some modules have accepted design decisions that further constrain implementation:

- Directus session authentication:
  [Directus session authentication](../decisions/directus-session-auth.md)
- Directus sealed sessions: [Directus sealed session](../decisions/directus-sealed-session.md)
- Directus and Nitro error normalization:
  [Directus and Nitro error normalization](../decisions/directus-error-normalization.md)
- Simple rate limiter guarantees: [Simple rate limiter](../decisions/simple-rate-limiter.md)
- Static-text translation surface:
  [Static text and Vue I18n compatibility](../decisions/static-text-i18n-compatibility.md)

Read the applicable decision record before changing that feature. Preserve it unless the user
explicitly asks to revisit the decision and the resulting compatibility impact.
