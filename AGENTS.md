# Working on Nuxt modules

> Operational contract for coding agents working in this repository.

This pnpm workspace contains standalone Nuxt 4 modules under `modules/`, supporting packages under
`packages/`, and one isolated playground per module. Installable consumer skills live under
`skills/`; maintainer skills live under `.agents/skills/`.

## Sources and precedence

1. The user's current request defines the outcome and scope and takes precedence over repository
   guidance.
2. This file sets repository constraints. Follow more specific applicable `AGENTS.md` instructions
   within their scope.
3. [Agent workflow](docs/agent-workflow.md) owns task phases, required skill use, documentation
   routing, and handoff.
4. Topic documentation under `docs/` defines contracts, runbooks, and accepted decisions.
5. Manifests, effective configuration, implementation, tests, and comparable packages establish
   current behavior and reveal conventions where guidance leaves a gap.

Existing code does not authorize a pattern that contradicts a documented contract. When sources
disagree, establish the intended contract before changing behavior. Resolve clear changes within
scope; surface unresolved conflicts when they affect public behavior or compatibility.

## Required workflow

Start every task with the [workflow](docs/agent-workflow.md): plan, implement, review, cleanup and
verify, handoff. Read and apply its five workflow skills and the documentation selected by its
routing table before making the decisions they govern. Keep each pass within the requested scope; an
assessment can conclude **no further changes needed**.

For TypeScript code, configuration, or convention decisions, apply
[TypeScript conventions across phases](docs/agent-workflow.md#typescript-conventions-across-phases).
Module work also uses `authoring-nuxt-modules` and `nuxt-module-utils`; production-readiness and
pre-publish reviews use `auditing-nuxt-modules`. Skills route the work; `docs/` owns repository
contracts.

## Design priorities

Prefer, in order: correctness, small changes, existing patterns, readability, type safety, and
performance. Choose the smallest maintainable solution, rather than optimizing for fewer lines.
Reuse shared utilities, framework capabilities, and installed dependencies where their semantics
fit. Add abstractions, configuration, defensive branches, or refactors only for a concrete current
need.

Keep presentational concerns in components and reusable logic in composables. Preserve route and
file naming contracts. Fix verified causes; workarounds or symptom-masking changes require explicit
permission. Keep adjacent cleanup outside the task.

## Safety and compatibility

- Preserve unrelated work and supported UX, APIs, runtime configuration, generated types, and
  package contracts. Breaking changes require an explicit request and compatibility decision.
- Validate untrusted boundaries with Zod where applicable. Preserve Node server and Cloudflare
  Workers compatibility, including SSR/client and build/runtime boundaries.
- Changes to `.husky/**`, `.agents/skills/**`, or Vitest coverage include paths require an explicit
  request. Do not weaken checks to make a change pass.
- New dependencies require an explicit request and demonstrated codebase benefit. TypeScript
  assertions or casts require an explicit request or human-maintainer approval; global type stubs
  require an explicit request. Model types correctly instead of bypassing errors.
- Pin third-party GitHub Actions to full immutable commit SHAs, retaining the intended release or
  tag in an inline comment. Mutable branches and tags are prohibited.
- Do not verify changes by starting a browser session manually.

## Package manager and workspace safety

Use Node.js 24 and the exact pnpm version in `package.json`. Agents invoke it as
`corepack pnpm ...`; user-facing documentation uses `pnpm ...` unless Corepack itself is relevant.
Follow [workspace and tooling](docs/workspace.md) for commands, ownership, and dependency rules.

- Never install dependencies or modify, delete, relink, or repair `node_modules` in the human
  collaborator's primary checkout. Use an isolated checkout when installation is necessary.
- Run dependency-mutating commands only for required dependency changes. Otherwise preserve
  `node_modules`, `pnpm-lock.yaml`, and pnpm configuration.
- Preserve the configured external pnpm store; never override it or create a repository-local store.
- Dependency additions and version changes use workspace catalog entries with exact pins. Peer
  compatibility ranges follow the workspace contract.
- If isolation is unavailable or pnpm reports a store mismatch, stop and report it instead of
  altering the primary checkout.

## Completion and handoff

Select local checks by the task's changed or explicitly reviewed surfaces and affected consumers
using [verification selection](docs/testing.md#selecting-verification-for-a-change). Unrelated dirty
files do not expand the task. Required hooks, CI, build, package, and release gates remain in force.
Report actual results and exact commands; never call a skipped or failing check successful.

Add a permanent test only for a meaningful protection gap that existing coverage does not adequately
protect. A code edit, bug fix, or review finding alone does not require another test. Follow the
[testing policy](docs/testing.md#choosing-and-maintaining-tests); coverage and test count are not
goals.

Reconcile implementation, tests, applicable JSDoc, maintainer docs, consumer docs and skills,
dependencies, compatibility, and release impact before finishing:

- Public module API or consumer-visible behavior changes update the package README and matching
  installable consumer skill under `skills/` together.
- Work that changes, documents, or relies on `packages/module-utils` keeps its
  [cookbook](docs/module-cookbook/module-utils.md), focused articles, public exports, and runtime
  subpaths synchronized. Shared-package changes also follow their routed maintainer-skill contracts.
- Use one Changeset per public-package concern. Unrelated changes need separate entries even for the
  same package or release level; follow [publishing](docs/publishing.md).

Finish when the scoped diff is reviewed, affected contracts agree, and applicable checks pass or
their blockers are recorded. Use the applicable exact
[handoff template](docs/agent-workflow.md#5-handoff), including concrete reasons for inapplicable
contract gates. Commit, push, or create PRs only when requested; the human collaborator otherwise
reviews and commits the work.

## When to ask

Ask when missing information or an unresolved conflict materially changes scope, correctness,
compatibility, or another consequential decision. Resolve routine choices from repository evidence
and continue work already authorized.
