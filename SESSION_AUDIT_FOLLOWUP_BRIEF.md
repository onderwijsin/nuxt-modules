# Directus session and authentication follow-up audit brief

## Goal

Repeat the previous independent production-readiness audit of the Directus client session and
authentication implementation after the session-hardening changes described below. Use the same
confidentiality, integrity, lifecycle, failure-handling, migration-safety, and release-readiness
standard as the original audit.

The prior audit verdict was **Do not publish yet**. Do not assume that the changes below are correct
because they were implemented or because the focused tests pass; independently verify their runtime
behavior and their interaction with H3, Nitro storage, Nuxt SSR, and packed consumers.

## Previous findings and claimed remediation

The previous audit identified:

1. `maskSecretsInPlayground` resolving as `undefined`, causing the playground inspection route to
   return raw access and refresh tokens by default.
2. The diagnostic playground route having no enforced development-only isolation.
3. Session reads validating the seal but not the payload's `expiresAt`.
4. Refresh-flight results storing live token pairs in Nitro storage.

The current implementation claims to address them as follows:

- `modules/directus-client/src/config/options.schema.ts` supplies the masking default explicitly.
- `modules/directus-client/playground/server/api/session-inspection.get.ts` returns `404` when
  `import.meta.dev` is false.
- `modules/directus-client/src/runtime/server/utils/session.ts` validates positive integer expiry
  values and clears payloads whose `expiresAt` has passed.
- `modules/directus-client/src/runtime/server/utils/auth.ts` stores a `sealedSession` value in Nitro
  storage and unseals it before reusing a completed refresh result.

The associated regression coverage is in:

- `modules/directus-client/__tests__/options.test.ts`
- `modules/directus-client/__tests__/session.test.ts`
- `modules/directus-client/__tests__/auth.test.ts`

## Scope

Review the complete session implementation and all integration points, with the same scope as the
original audit:

- session creation, reading, refresh, logout, clearing, expiry, and invalidation;
- H3 sealing and unsealing usage, cookie attributes, cookie/header boundaries, and size limits;
- `boop1:` envelope handling, authenticated payload versioning, malformed and legacy-cookie
  behavior, and payload expiry enforcement;
- active and previous session-secret rotation, resealing, configuration ordering, concurrent
  deployments, and operational migration procedures;
- refresh-flight storage confidentiality, ciphertext reuse, storage-key derivation, TTLs, invalid
  stored results, and rotation while a sealed refresh result is in flight;
- secret handling across module setup, runtime config, SSR, logs, errors, diagnostics, generated
  artifacts, and client-visible state;
- authentication handlers, Directus credential selection, proxy behavior, CSRF protections, refresh
  safety, logout cleanup, and upstream failure handling;
- development-only playground isolation, masking defaults, deterministic development secrets, and
  accidental production deployment behavior;
- Node and Cloudflare Workers compatibility where relevant;
- tests, coverage, README, consumer skill, decision records, Changesets, changelog/release notes,
  packed output, and external-consumer behavior.

## Required verification targets

At minimum, independently reproduce these cases:

1. Parse empty and partially specified client options and prove the effective masking value is
   `true` unless explicitly disabled.
2. Exercise the inspection endpoint in development and production builds. Confirm that production
   returns `404` before reading or rendering cookie data.
3. Seal a session whose cookie `maxAge` is still valid but whose payload `expiresAt` is in the past.
   Confirm that the cookie is cleared and no snapshot is returned.
4. Complete a refresh and inspect the exact Nitro storage record. Confirm it contains no plaintext
   access token, refresh token, or nested `session` object, and that another request can unseal and
   reuse the result.
5. Rotate the active secret while a sealed refresh result exists. Confirm the result is either
   correctly resealed with the new active secret or safely invalidated, never written back under an
   obsolete key.
6. Tamper with, truncate, replay, expire, and use wrong-key or legacy session values. Confirm all
   invalid paths fail closed and clear the local cookie where appropriate.
7. Exercise concurrent refreshes with the default in-memory driver and a shared, read-after-write
   consistent driver. Distinguish the documented cross-instance race limitation from defects in the
   local coordination protocol.
8. Verify SSR state, hydration, `/auth/session`, proxy requests, logout, upstream refresh failure,
   and disabled-auth behavior do not expose or retain usable credentials unexpectedly.
9. Inspect Node and Cloudflare builds and the packed npm tarball. Validate imports, runtime
   subpaths, declarations, dependency classification, and absence of workspace-only references.

## Evidence and validation baseline

The implementation pass reported the following evidence, which must be independently confirmed:

- focused Directus auth/session/options/proxy tests: 53 tests passed;
- workspace tests: 101 test files and 513 tests passed;
- workspace typecheck, lint, formatting, and package build completed successfully;
- package packing and publint completed successfully;
- external-consumer validation reached Nuxt production compilation but did not provide a final
  assertion result in the prior tool session; treat packed external-consumer behavior as
  **unverified** until rerun successfully.

Use the repository's documented validation commands where practical:

```sh
corepack pnpm format
corepack pnpm lint:fix
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build:utils
corepack pnpm dev:prepare
corepack pnpm build
corepack pnpm pack:packages /tmp/<unique-audit-dir>
corepack pnpm validate:external-consumer --packages-dir=/tmp/<unique-audit-dir>
```

Do not modify the primary checkout's dependencies or generated tracked artifacts. Disposable
validation artifacts may be created outside the repository.

## Documentation and operational review

Check whether the following contracts are accurate and sufficient for an unfamiliar consumer and
operator:

- `modules/directus-client/README.md`;
- `skills/nuxt-directus-client/SKILL.md`;
- `docs/decisions/directus-sealed-session.md`;
- `modules/directus-client/CHANGELOG.md`;
- `.changeset/directus-session-hardening.md`.

Pay particular attention to secret rotation overlap, shared Nitro storage protection, cookie
security behind proxies, development-only diagnostics, and the fact that Directus remains the
authorization boundary.

## Deliverable

Provide a concise report containing:

1. an overall production-readiness verdict: **Publish**, **Publish after fixes**, or **Do not
   publish yet**;
2. findings ordered by severity with classification, affected files/behavior, evidence, violated
   invariant, realistic scenario, smallest fix, and regression/documentation requirements;
3. explicit confirmation or rejection of each previous remediation above;
4. test and coverage gaps relevant to this scope;
5. session-secret rotation and refresh-storage operational guidance;
6. documentation, Changeset, changelog, and release-contract issues;
7. residual risks and recommended follow-up work;
8. whether the packed package can be trusted in an unrelated production Nuxt application, clearly
   identifying any unverified validation.

Use the repository's read-only audit handoff structure from `docs/agent-workflow.md`, and preserve
the exact P0–P3 finding format required by the `auditing-nuxt-modules` skill.
