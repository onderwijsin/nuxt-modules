# AGENTS.md

> **Operational contract for coding agents working in this repository**

---

## Before You Start

1. Understand the user's request precisely.
2. Identify which systems or files are affected.
3. Read only the relevant documentation under `docs/` if available.
4. Inspect existing implementations before introducing new patterns.
5. Keep changes as small as possible.

---

## How to Decide

### Design Priorities

When multiple valid solutions exist, prefer:

1. Correctness
2. Small changes
3. Existing patterns
4. Readability
5. Type safety
6. Performance

### Hard Rules

- **MUST NOT** introduce breaking UX or API-shape changes without explicit request
- **MUST NOT** implement workarounds, quick fixes, or symptom-masking changes without explicit
  permission; fixes must address the verified root cause
- **MUST NOT** edit files under `.husky/**` unless explicitly requested in the current task
- **MUST NOT** edit anything under `.agents/skills/**` unless explicitly requested
- **MUST NOT** add dependencies unless explicitly requested and demonstrated to improve codebase
  health and quality
- **MUST NOT** change Vitest coverage include paths unless explicitly requested
- **MUST NOT** add tests solely to meet coverage thresholds - tests should only be added for known
  risks or regression prevention
- **MUST NOT** add global type stubs to fix TypeScript issues unless specifically requested
- **MUST** invoke PNPM as `corepack pnpm ...` instead of plain `pnpm ...`
- **MUST NOT** create, configure, select, or use a repository-local PNPM store, including
  `.pnpm-store/`, `node_modules/.pnpm/`, or any other store path below the repository
- **MUST NOT** set, unset, or override PNPM's `store-dir` through a config file, environment
  variable, CLI flag, or `pnpm config` command
- **MUST NOT** change global or project PNPM configuration, including the configured store path
- **MUST NOT** run `pnpm install`, `pnpm add`, `pnpm remove`, `pnpm update`, or any command that
  mutates `node_modules`, the PNPM store, or the lockfile unless the current task explicitly
  requires dependency or package-manager work
- **MUST NOT** use `--store-dir`, `store-dir=`, `PNPM_STORE_DIR`, or an equivalent override
- **MUST** use the existing PNPM store configuration and leave dependency-linking state unchanged
  when running checks or scripts
- **MUST** use the project-pinned package manager via Corepack when running PNPM-related commands
- **MUST** prefer inspection commands that do not modify dependency state when dependency changes
  are not part of the task
- **MUST** use Zod for boundary validation where applicable
- **MUST** preserve Node server and Cloudflare Workers runtime compatibility
- **MUST** update the corresponding installable consumer skill in `skills/` whenever a module's
  public API surface changes, alongside the module README

### Package Manager Contract

- This repository is pinned to the package manager declared in `package.json`
- Agents must invoke PNPM as `corepack pnpm ...` instead of plain `pnpm ...`
- Agents must treat any untracked or modified `.pnpm-store/**` content as a problem to avoid, not as
  a normal byproduct of their work
- Agents must not add `.npmrc` settings, shell exports, or command flags that redirect the PNPM
  store into the repository
- If dependency work is explicitly required, agents must keep the existing lockfile and
  `node_modules` topology stable unless the requested change genuinely requires updates
- If PNPM store behavior is unexpected, agents must stop and report the cause instead of continuing
  with more package-manager mutations

### Working Principles

- Prefer extending existing implementations over introducing new abstractions
- Keep presentational concerns in components and reusable logic in composables
- When repository conventions are unclear, inspect nearby code before inventing a new pattern
- Verify real runtime behavior from code before changing documentation or implementation
- Read only the documentation relevant to the files or systems you are modifying
- Keep scope tight — avoid opportunistic refactors
- Preserve existing route and file naming contracts unless explicitly asked to change them
- in user facing docs, assume corepack is enabled, thus `pnpm ...` is allowed

---

## When to Ask

Ask for clarification instead of guessing when:

- Requirements are ambiguous
- Multiple architectural directions are equally valid
- The requested change could break compatibility

---

## Definition of Done

A task is **ONLY** complete when **ALL** applicable items are satisfied:

1. Formatting applied with `pnpm fmt`
2. Lint autofixes applied and lint passes with `pnpm lint:fix`
3. TypeScript checks pass with `pnpm typecheck`
4. Unit tests pass with `pnpm test`
5. Documentation updated in `docs/` (single source of truth)
6. When a module's public API surface changes, the corresponding installable consumer skill in
   `skills/` and module README are updated
7. All code written or touched has proper JSDoc where applicable
8. Runtime contracts remain backward-compatible unless explicitly requested

**Important:** After completing the above, the agent **MUST NOT** commit the changes, unless
explicitly requested. Instead, the agent **MUST** provide a summary of the work done, including:

- What changed
- Impact on contracts and behavior
- Open risks or follow-up work
- A ready to copy commit message following the conventional commit rules (eg
  `'feat(core): add new utility'`)

It is the responsibility of the human collaborator to review, approve, and commit the changes.

---

## Git

- **Agents MUST NOT commit changes directly.** All changes must be reviewed and committed by a human
  collaborator.
- Use Conventional Commit messages: `<type>(<scope>): <subject>` for summarizing changes
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `build`, `perf`,
  `revert`
