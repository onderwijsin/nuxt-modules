# Agent workflow and documentation routing

Use this workflow for every task: plan, implement, review, cleanup and verify, handoff.
[AGENTS.md](../AGENTS.md) holds repository constraints; topic docs own technical contracts. This
article owns the task sequence, required skill use, documentation routes, and handoff.

## Required skills

Read and apply these five skills in their phases for every task. Keep each pass within the task's
scope; a pass can conclude that no changes are needed.

| Skill                                                                 | Question                                         | Phase                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [implement-simply](../.agents/skills/implement-simply/SKILL.md)       | What is the simplest sufficient solution?        | Plan and implement.                                                                     |
| [review-code-bloat](../.agents/skills/review-code-bloat/SKILL.md)     | Does each capability earn its maintenance cost?  | Review necessity and unsupported flexibility.                                           |
| [review-code-hygiene](../.agents/skills/review-code-hygiene/SKILL.md) | Is necessary code easy to understand and change? | Review responsibilities, coupling, types, control flow, and error ownership.            |
| [review-test-value](../.agents/skills/review-test-value/SKILL.md)     | What meaningful failure would this test detect?  | Review behavioral evidence, independent expectations, overlap, and refactor resilience. |
| [clean-code](../.agents/skills/clean-code/SKILL.md)                   | Which justified improvements should be applied?  | Clean up scoped findings and verify the result.                                         |

For documentation-only tasks, apply simplicity, necessity, and clarity to the instructions and
routes. Test-value review assesses the selected verification; when no tests are affected, conclude
that pass without expanding into an unrelated suite. For read-only tasks, implementation means
investigation and cleanup means selecting justified recommendations; preserve the read-only scope.

### TypeScript conventions across phases

For TypeScript code, Vue scripts, tests, TypeScript configuration, or convention decisions, also
read [typescript-conventions](../.agents/skills/typescript-conventions/SKILL.md) and the reference
branches relevant to the decision. It supplies conventions throughout the workflow, without adding a
phase.

| Phase     | Apply the reference                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| Plan      | Resolve applicable contracts and effective compiler, module, formatter, and linter configuration.                     |
| Implement | Apply relevant conventions while preserving framework and runtime boundaries.                                         |
| Review    | Distinguish adopted requirements, inferred habits, and recommendations; give a concrete consequence for each finding. |
| Cleanup   | Preserve the same conventions and contracts while resolving findings.                                                 |

Repository contracts, effective configuration, and framework guidance govern. Skill examples fill
gaps; they do not authorize tooling or architecture migrations. Keep observations in working context
unless a coding guide is requested.

Use other applicable workspace skills selected by the routes below or the task's framework. Read
their instructions and required references before making the decisions they govern.

## 1. Plan

Use `implement-simply` to establish the outcome and direct approach.

1. Read the request and applicable `AGENTS.md` files. Run `git status --short` and preserve existing
   changes as user-owned unless the task created them.
2. Name the observable result, owning packages or documentation, and likely affected files. Inspect
   their implementation, tests, configuration, and scripts, plus a comparable implementation before
   introducing a pattern.
3. For every task, read the [module cookbook index](module-cookbook/index.md) and
   [Module utilities](module-cookbook/module-utils.md), even when no shared utility appears
   necessary. Select the relevant cookbook articles and every matching documentation route below.
   Read each selected article completely before making its decision, including applicable feature
   decisions and skill references.
4. Trace affected callers, exports, registrations, runtime boundaries, and consumers. Decide the
   impact on implementation, tests and fixtures, maintainer docs, package READMEs, consumer skills,
   dependencies and metadata, compatibility, and Changesets. Keep brief reasons in working context,
   including why an area is unaffected.
5. Choose the smallest sufficient change and its checks using
   [verification selection](testing.md#selecting-verification-for-a-change). In the progress update
   before substantive edits, state the scope, relevant routes and skills, and material assumptions.

Planning is complete when the outcome, owning boundary, applicable contracts, and verification path
are clear. Resolve routine choices from repository evidence; use `AGENTS.md` for consequential
conflicts and questions.

### Documentation routes

| Task or affected surface                                                     | Required guidance                                                                                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any repository change                                                        | This article and the affected package, source, tests, documentation, and decisions                                                                            |
| Module or package contribution workflow                                      | [`contributing.md`](contributing.md)                                                                                                                          |
| Workspace, dependencies, scripts, installs, generated output, or validation  | [`workspace.md`](workspace.md)                                                                                                                                |
| Any publishable or local Nuxt module work                                    | Use `authoring-nuxt-modules` and `nuxt-module-utils`; start with the [module cookbook index](module-cookbook/index.md)                                        |
| New publishable module or package-structure change                           | [Package anatomy](module-cookbook/package-anatomy.md)                                                                                                         |
| Migrating an application-local module                                        | [Migration checklist](module-cookbook/migrating-local-modules.md)                                                                                             |
| Module setup, options, runtime registration/config, templates, types, or CSS | [Module entrypoint](module-cookbook/module-entrypoint.md) and [patterns](module-cookbook/patterns-and-conventions.md)                                         |
| `packages/module-utils` or one of its consumers                              | Use `nuxt-module-utils`; read [Module utilities](module-cookbook/module-utils.md), plus [guards](module-cookbook/guards.md) when narrowing runtime values     |
| `packages/test-utils` or shared test infrastructure                          | Use `nuxt-test-utils`; read [Test utilities](module-cookbook/test-utils.md)                                                                                   |
| Tests, fixtures, coverage, or test strategy                                  | Use `nuxt-test-utils`; read [`testing.md`](testing.md) and [module testing](module-cookbook/testing.md)                                                       |
| Module playground                                                            | [Playgrounds](module-cookbook/playground.md)                                                                                                                  |
| Public module API or consumer-visible behavior                               | [Documentation and consumer skills](module-cookbook/documentation-and-skills.md)                                                                              |
| Package/release behavior or Changesets                                       | [`publishing.md`](publishing.md)                                                                                                                              |
| GitHub workflows or local Actions                                            | [`actions.md`](actions.md) and [`security.md`](security.md)                                                                                                   |
| Dependencies, security findings, permissions, secrets, or vulnerability work | [`security.md`](security.md)                                                                                                                                  |
| Substantial module, production-readiness, or release audit                   | Use `auditing-nuxt-modules` and its routed references                                                                                                         |
| Architecture or cross-package decision records                               | [`decisions/index.md`](decisions/index.md) and [`decisions/template.md`](decisions/template.md)                                                               |
| Directus session authentication or sealed sessions                           | [`decisions/directus-session-auth.md`](decisions/directus-session-auth.md) and [`decisions/directus-sealed-session.md`](decisions/directus-sealed-session.md) |
| Simple rate limiter guarantees                                               | [`decisions/simple-rate-limiter.md`](decisions/simple-rate-limiter.md)                                                                                        |
| Static-text translation compatibility                                        | [`decisions/static-text-i18n-compatibility.md`](decisions/static-text-i18n-compatibility.md)                                                                  |
| TypeScript code, configuration, or convention decisions                      | [TypeScript conventions across phases](#typescript-conventions-across-phases) and the affected package's effective configuration                              |
| Local verification selection                                                 | [Testing policy and check selection](testing.md), [workspace commands and safety](workspace.md)                                                               |
| Agent guidance or task workflow                                              | [Required skills](#required-skills), [repository contract](../AGENTS.md), and the topic docs reached by changed routes                                        |
| Compatibility claims or runtime validation                                   | [Compatibility testing policy](decisions/compatibility-testing.md)                                                                                            |
| Directus and Nitro error contracts                                           | [Error normalization decision](decisions/directus-error-normalization.md)                                                                                     |

Multiple routes can apply. Topic docs and accepted decisions remain the source of truth; existing
implementation helps interpret them and does not silently override them.

## 2. Implement

Apply `implement-simply` at the owning boundary, using the
[module cookbook](module-cookbook/index.md), its task-selected articles, and
[Module utilities](module-cookbook/module-utils.md) as supporting references alongside the skill.
Update affected callers, configuration, exports, tests, and documentation together according to the
planned impacts and routed contracts. Remove support made unused by the change after checking
surviving consumers.

Use selected checks while iterating when they provide useful evidence. Keep edits and autofixes
within scope. Implementation is complete when the requested result reaches all affected paths and
each changed part has a current purpose.

## 3. Review

Apply `review-code-bloat`, then `review-code-hygiene`, then `review-test-value` to the task's
complete diff or named assessment target. Keep these passes read-only and collect findings before
cleanup. Also review correctness and affected contracts; the three passes do not replace that
assessment.

Use the [module cookbook](module-cookbook/index.md), its task-selected articles, and
[Module utilities](module-cookbook/module-utils.md) as supporting references alongside the review
skills when assessing findings against repository contracts.

Use each skill's evidence checks and finding format. Group findings with the same cause and keep
working notes for resolved findings. A pass ends with evidence-backed findings or a brief
no-material-findings conclusion; finding counts and lines removed are not goals.

## 4. Cleanup and verify

Use `clean-code` to recheck findings against current files and apply justified improvements within
the authorized task. No fresh approval is needed for scoped fixes. Preserve unresolved candidates
whose evidence is missing. A cleanup pass may need no edits; a read-only task ends with
recommendations.

Update affected callers, tests, and docs with each coherent change. Revisit the relevant review pass
when cleanup changes its evidence. Run the checks selected under
[verification selection](testing.md#selecting-verification-for-a-change), resolve failures
introduced by this task, and reconcile the planned impacts and `AGENTS.md` completion gates.

Before handoff, inspect `git status --short`, `git diff --check -- <task-paths>`, and
`git diff -- <task-paths>`, including any new untracked files separately. Compare task files with
the starting state when they already contained edits. Confirm the task's diff is focused, affected
contracts and documentation agree, and material findings are resolved or explicitly deferred.

## 5. Handoff

Use the change handoff whenever files changed. Use every heading, even for a documentation-only
change or when validation is blocked:

````markdown
### Changed

- List the concrete changes.

### Validation

- Passed: `exact command`
- Not run or blocked: `exact command` — reason

### Contracts and documentation

- Describe public/runtime compatibility impact.
- List synchronized docs and consumer skills, or state why none were needed.
- List Changesets, or state why none were needed.

### Risks and follow-up

- List remaining risks or `None`.

### Commit message

```text
<type>(<scope>): <subject>
```
````

For a read-only diagnosis, review, or audit, use this structure instead:

````markdown
### Verdict

- State the outcome or readiness decision first.

### Findings

- List evidence-backed findings in priority order, or state that none were found.

### Validation and evidence

- Inspected: `paths or artefacts`
- Passed: `exact command`
- Not run or unavailable: `exact command or evidence` — reason

### Contracts and impact

- Describe the affected public/runtime/documentation contracts and whether files were changed.

### Risks and follow-up

- List remaining risks or `None`.

### Suggested commit message

```text
<type>(<scope>): <subject>
```
````

Use `N/A — read-only assessment; no change to commit` when no coherent follow-up commit can be
suggested. A specialized review skill may define additional finding fields or a stricter verdict;
include those inside this assessment structure without dropping its evidence and risk sections.

Allowed Conventional Commit types are `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`,
`ci`, `build`, `perf`, and `revert`. Do not commit the changes unless the user explicitly requests
it; the commit message is a ready-to-copy handoff for the human collaborator.
