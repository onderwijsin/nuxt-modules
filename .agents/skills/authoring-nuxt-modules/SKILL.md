---
name: authoring-nuxt-modules
description: Author and maintain publishable or local Nuxt modules in the onderwijsin/nuxt-modules repository. Use when creating, extending, reviewing, testing, documenting, or restructuring a module, its playground, public API, package metadata, or consumer-facing skill.
---

# Authoring Nuxt Modules

Use the repository cookbook as the local source of truth. Start with `docs/module-cookbook/package-anatomy.md`, then read only the linked article for the task: playground, module entrypoint, module-utils, patterns and conventions, testing, or documentation and skills.

## Workflow

1. Inspect the affected module, README, tests, playground, and a comparable module before introducing a pattern. The cookbook is authoritative for its contracts but is not exhaustive; nearby code establishes additional conventions.
2. Fully use Nuxt's MCP documentation before making Nuxt-specific decisions. Prefer the official module getting-started, anatomy, basics/advanced recipes, dependencies, testing, and best-practices guides, plus the relevant Nuxt Kit reference.
3. Keep `src/module.ts` orchestration-only. Put build-time helpers in `src/config/`, consumer runtime code in `src/runtime/`, and public types in `src/types/`. Use Nuxt Kit registration utilities and explicit imports in published runtime code.
4. Preserve public contracts. Update the README and matching consumer skill under `skills/` whenever options, exports, components, auto-imports, compatibility, or behavior change.
5. Keep changes small. Do not add dependencies or change workspace/package-manager configuration without explicit need. Use Zod for runtime boundary validation where option shapes require it.
6. Validate with the relevant repository scripts in `docs/workspace.md`; run the complete suite for broad or release-facing changes. Do not commit generated output.

## Nuxt documentation map

Use these official pages through the Nuxt MCP server or their canonical URLs:

- Foundations: <https://nuxt.com/docs/4.x/guide/modules/getting-started>, <https://nuxt.com/docs/4.x/guide/modules/module-anatomy>, <https://nuxt.com/docs/4.x/guide/modules/recipes-basics>, <https://nuxt.com/docs/5.x/guide/modules/module-dependencies>, <https://nuxt.com/docs/5.x/guide/modules/recipes-advanced>, <https://nuxt.com/docs/5.x/guide/modules/testing>, and <https://nuxt.com/docs/5.x/guide/modules/best-practices>.
- Runtime configuration: <https://nuxt.com/docs/4.x/guide/going-further/runtime-config>.
- Nuxt Kit: <https://nuxt.com/docs/4.x/api/kit/modules>, <https://nuxt.com/docs/4.x/api/kit/runtime-config>, <https://nuxt.com/docs/4.x/api/kit/templates>, <https://nuxt.com/docs/4.x/api/kit/app-config>, <https://nuxt.com/docs/4.x/api/kit/nitro>, <https://nuxt.com/docs/4.x/api/kit/resolving>, <https://nuxt.com/docs/4.x/api/kit/logging>, <https://nuxt.com/docs/4.x/api/kit/builder>, <https://nuxt.com/docs/4.x/api/kit/examples>, <https://nuxt.com/docs/4.x/api/kit/layers>, <https://nuxt.com/docs/4.x/api/kit/programmatic>, <https://nuxt.com/docs/4.x/api/kit/compatibility>, <https://nuxt.com/docs/4.x/api/kit/autoimports>, <https://nuxt.com/docs/4.x/api/kit/components>, <https://nuxt.com/docs/4.x/api/kit/context>, <https://nuxt.com/docs/4.x/api/kit/pages>, <https://nuxt.com/docs/4.x/api/kit/layout>, <https://nuxt.com/docs/4.x/api/kit/head>, and <https://nuxt.com/docs/4.x/api/kit/plugins>.
- Advanced behavior: <https://nuxt.com/docs/4.x/api/advanced/hooks> and <https://nuxt.com/docs/4.x/api/advanced/import-meta>.
