---
name: authoring-nuxt-modules
description: Author and maintain publishable or local Nuxt modules in the onderwijsin/nuxt-modules repository. Use for any task that creates, extends, fixes, reviews, tests, documents, migrates, or restructures a module, its package metadata, playground, runtime behavior, public API, or consumer-facing documentation and skill.
---

# Author Nuxt modules

Use this skill as the procedural entry point. Repository contracts and technical facts live in
`AGENTS.md` and `docs/`; do not reconstruct them from memory or duplicate them here.

## Route the work

1. Read [`AGENTS.md`](../../../AGENTS.md) and the
   [agent workflow](../../../docs/agent-workflow.md) completely.
2. Start with the [module cookbook index](../../../docs/module-cookbook/index.md). Select and fully
   read every article triggered by the task, including any linked feature decision under
   `docs/decisions/`.
3. Read the affected module's implementation, tests, playground, package metadata, and public
   documentation as applicable. Inspect one comparable module before introducing a pattern.
4. For Nuxt-specific design decisions, consult the relevant official sources routed by
   [the official Nuxt documentation router](../../../docs/module-cookbook/official-nuxt-documentation.md).
   Fully use Nuxt's MCP documentation when it is available.

## Implement the contract

1. Trace the change across setup, runtime behavior, emitted output, tests, playground, package
   metadata, and consumer documentation rather than treating the requested file in isolation.
2. Keep `src/module.ts` focused on orchestration. Put build-time helpers in `src/config/`, consumer
   runtime code in `src/runtime/`, and public types in `src/types/`. Use Nuxt Kit registration
   utilities and explicit imports in published runtime code.
3. Preserve public contracts unless the user explicitly requests a compatibility change. Use Zod
   at applicable runtime boundaries and preserve Node server and Cloudflare Workers compatibility.
4. Prefer the smallest root-cause change and existing repository patterns. Do not add dependencies
   or change workspace/package-manager configuration without explicit need.
5. Complete the impact decisions in the [agent workflow](../../../docs/agent-workflow.md). Update
   the module README and matching
   consumer skill under `skills/` whenever options, exports, components, auto-imports,
   compatibility, or behavior change. Keep maintainer docs and Changesets synchronized when their
   triggers apply.

## Verify and hand off

1. Review the complete diff and reconcile every impact category.
2. Run the applicable validation from [workspace tooling](../../../docs/workspace.md); use the complete suite for broad,
   package-facing, or release-facing changes. Do not commit generated output.
3. Use the applicable exact handoff format in the
   [agent workflow](../../../docs/agent-workflow.md). Do not commit the changes unless the user
   explicitly requests it.
