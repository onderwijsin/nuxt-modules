# Markdown Documents implementation plan

## Status and scope

Phase 0 is the development scaffold. Phase 1 adds validated options, typed definitions and a server
registry. Phase 2 adds structured resolution, listing and URL mapping. Phase 3 implements JSON
validation, YAML serialization and dynamic HTTP delivery. Phase 4 is abandoned: consumers own
prerender route discovery and scheduling. Phase 5 records the standalone release evidence and
remaining environment limits. Implement phases sequentially, with tests and documentation in each
phase rather than deferring verification until the end. Release Markdown Documents as a standalone
module before AI Toolkit. No standalone release gate requires AI Toolkit to exist or be installed.

Source requirements:

- [#354: Markdown Documents](https://github.com/onderwijsin/nuxt-modules/issues/354).
- [#353: AI Toolkit](https://github.com/onderwijsin/nuxt-modules/issues/353).

The module owns fetch → transform → structured resolution → YAML serialization → raw delivery.
Consumers own data access, publication filtering, credentials, canonical HTML routes, and conversion
of source content to Markdown. AI Toolkit owns HTML conversion, negotiation, aliases and discovery;
its `nuxt-llms` integration owns `/llms.txt` and `/llms-full.txt`.

## Proposed API and invariants

The module accepts these validated options. The reserved prerender setting has no effect:

| Option      | Proposed default   | Meaning                                                     |
| ----------- | ------------------ | ----------------------------------------------------------- |
| `enabled`   | `true`             | Disable all registration and build-time listing when false. |
| `dir`       | `server/documents` | Definition directory relative to application root.          |
| `rawPrefix` | `undefined`        | Optional prefix; unset or `null` serves `/:path.md`.        |
| `prerender` | `false`            | Reserved compatibility setting; no effect.                  |

Public server-only export: `@onderwijsin/nuxt-markdown-documents/server`. Expose
`defineMarkdownDocument` there and as a Nitro server auto-import, never an app auto-import. Export
the document and listing types from the same subpath using type-only exports.

```ts
interface MarkdownDocument {
  frontmatter: Record<string, unknown>;
  body: string;
}

interface MarkdownDocumentListItem {
  title: string;
  path: string;
  description?: string;
}
```

`defineMarkdownDocument<TSource>` must infer the non-null fetched type for `transform`, including
asynchronous transforms. A fetch returns `TSource | null` (synchronously or asynchronously); null
means unavailable and must never reach transform. Fetch context contains validated route params and
an optional H3 event: HTTP resolution provides an event, build-time resolution does not. Listings
accept an optional context and must work without a request event. No generic source registry,
module-owned client, universal converter, or search index is needed.

Definitions contain `route`, `fetch`, `transform`, optional `list`, and optional `prerender`. Return
precisely the structured document contract and keep metadata structured for programmatic resolution.
Do not serialize functions or credentials into Nuxt runtime config or app payloads.

Generated Nitro utilities are `resolveMarkdownDocument(path, context?)`,
`listMarkdownDocuments(context?)`, and `getMarkdownDocumentURL(path)`. The resolver returns a
structured document or null; only the HTTP boundary translates null to 404. Utilities share the same
service as HTTP handlers, without self-requests. The URL utility returns an application-relative raw
URL including `app.baseURL`, not a canonical HTML URL.

## Architecture and comparable implementations

- Keep `src/module.ts` as orchestration: lifecycle, validation, discovery, templates and hooks.
- Put option schemas, definition discovery and generated registry code under `src/config/`.
- Put public server types and pure services under `src/runtime/server/`; add runtime exports only
  when implemented. Keep build-only option types under `src/types/`.
- Use `discoverSourceFiles` from module-utils/build for deterministic discovery. Compare
  `healthcheck/src/config/components.ts` for generated consumer imports and server handlers.
- Generate the executable registry/service entrypoint with `addServerTemplate`; import consumer
  files statically into Nitro's graph. Published runtime files must not import `#build`.
- For prerender hook timing and event-free data access, inspect
  `directus-prerenderer/src/module.ts`. Reuse its lifecycle pattern, not its provider-specific
  behavior or dependencies.
- Follow `packages/test-utils` for fixture setup and requests, and the existing external consumer
  layer contract for public package registration.
- Runtime services must remain compatible with Node and Cloudflare Workers. Restrict filesystem
  discovery and Node APIs to setup/build time; do not evaluate consumer credentials in client code.

## Phase 0 — scaffold (this change)

- [x] Package metadata, version 0.0.0, exports, changelog and module-builder scripts.
- [x] Nuxt metadata, `markdownDocuments` config key, and shared setup lifecycle with `enabled`.
- [x] Private playground registering the public package and extending `playground-layer`.
- [x] Package-owned Vitest tests and a minimal Nuxt fixture using shared test utilities.
- [x] Packed-consumer fixture layer with sanity API and rendered page.
- [x] Package README, root package listing, consumer skill, Changeset and this plan.

Exit: module loads without claiming delivery behavior; format, lint, test and package gates run, or
their exact environment blockers are recorded. Do not mistake scaffold validation for MVP
acceptance. Avoid empty runtime folders and placeholder handlers that suggest working APIs.

## Phase 1 — definitions, types and setup validation (implemented)

1. Introduce Zod option validation using `validateModuleOptions` and the shared enabled schema.
   Validate directory/prefix inputs and resolve the default directory relative to rootDir, not Nuxt
   4's app srcDir. Document custom serverDir and layer semantics explicitly: start with the
   configured application directory only, without implicit merging of layer definitions.
2. Implement generic `defineMarkdownDocument` and publish the server subpath with declarations.
   Preserve inference across fetch/transform without assertions or global type stubs.
3. Discover consumer files, generate a server registry, and register server-only imports. Missing
   default directory means no definitions. An explicitly configured nonexistent directory should
   produce an actionable configuration error; test and document this distinction.
4. Define v1 route grammar: literal segments and named single-segment params (`/blog/:slug`), plus
   `/`. Reject optional params, wildcards, queries, fragments, ambiguous duplicate patterns and
   invalid parameter names initially. Static routes take precedence over parameter routes; reject
   equally specific overlapping parameter patterns with both source filenames in diagnostics.
   Validate imported definitions when the Nitro registry starts; do not evaluate consumer code
   inside Nuxt setup.
5. Add development watch handling for definition addition/removal so registry regeneration does not
   require restarting Nuxt. Trigger Nitro rollup reloads for membership changes; already imported
   files use Nitro's dependency watcher. Keep registration stable across rebuilds.

Tests: inferred transform input, rejected invalid signatures, exported declarations, default and
custom options, disabled setup, absent directory, nested source files, duplicate routes, generated
imports and watch changes. Extend the fixture with two local sources and one async definition.

Dependencies: reuse existing exact catalog entries for Zod and H3 when imported. No CMS dependency.
Add only runtime imports actually needed; update lockfile in a safe dependency environment. A server
subpath requires a full module build between module preparation and playground preparation.

Exit: clean build and packed consumer resolve the server subpath and Nitro imports. No client bundle
contains document definitions or credentials. README and consumer skill explain the new API.

## Phase 2 — routing, resolution, listing and URL mapping (implemented)

1. Implement a single path policy shared by matching, listing and URL mapping. Accept only local
   absolute canonical paths; reject external/protocol-relative URLs, backslashes, traversal, encoded
   separators/dot traversal, malformed encoding, queries and fragments. Define trailing slash
   normalization consistently (root stays `/`, other trailing slashes normalize away). Decode route
   parameters once and reject invalid encodings before invoking consumer code.
2. Match a canonical path directly to its definition. Call only fetch and transform for a single
   resolution, with no list call or full-collection scan. Keep null distinct from failed
   fetch/transform operations; use `attempt` to select an explicit failure policy.
3. Validate transform results at the runtime boundary. Keep body and frontmatter separate and do not
   invoke serialization from the structured resolver.
4. Implement typed listing independently of body retrieval. Validate nonblank titles, canonical
   paths, optional descriptions, and ownership by a matching definition. Identical entries for the
   same normalized path deduplicate; conflicting metadata or definition ownership fails with
   diagnostics instead of silently choosing a winner. Types without list contribute no entries.
5. Derive raw URLs with baseURL applied exactly once: `/` → `/index.md`, `/blog/one` →
   `/blog/one.md`; with baseURL `/docs/`, the latter becomes `/docs/blog/one.md`. An explicit
   `rawPrefix: "/raw"` adds that prefix, e.g. `/docs/raw/blog/one.md`. Canonical inputs remain
   app-relative and exclude baseURL. Reserve literal `/index` to avoid collision with the root
   mapping, with a clear setup/listing diagnostic. Test alternative prefixes and prohibit ambiguous
   suffix/prefix inputs. Include `rawPrefix: null`: `/blog/one` → `/blog/one.md`, `/` → `/index.md`,
   and baseURL `/docs/` → `/docs/blog/one.md`. Unset is the default no-prefix spelling; null is also
   accepted and uses Nuxt's normal merge semantics; reject empty strings and `/` rather than
   creating alternate spellings.

Tests: source independence (local object plus async fake service), null and failed fetches,
transform not called for null, list never called during resolution, list never retrieves bodies,
validation/deduplication, route precedence, root mapping, Unicode, encoded paths and baseURL.

Exit: server utilities work without self-requests, request context is optional, and errors do not
expose source payloads or credentials. Finalize names/signatures in README and consumer skill.

## Phase 3 — JSON frontmatter and raw HTTP delivery (implemented)

1. Add `yaml` as an exact catalog pin, selected from a maintained release satisfying the repository
   release-age policy. Validate frontmatter recursively as JSON-compatible data before
   serialization: plain objects, arrays, strings, booleans, finite numbers and null only. Reject
   undefined, bigint, functions, symbols, cycles, sparse arrays and class instances (including
   Date). Report the offending metadata path; avoid logging values or secrets. Repeated non-cyclic
   references may serialize independently; emit no aliases or custom tags.
2. Implement one serializer using YAML 1.2. It alone writes frontmatter delimiters; an empty
   frontmatter object returns just body. Document that body is Markdown without its own metadata
   block. Reject a leading body frontmatter block with a useful diagnostic rather than stripping
   content silently or producing duplicate metadata. Distinguish ordinary Markdown horizontal rules.
3. Register scoped GET handlers only for document patterns under rawPrefix. Return
   `Content-Type: text/plain; charset=utf-8`. Preserve normal HTML and unrelated API routes.
4. Translate null/unmatched documents to a generic 404. Invalid request paths must not reach fetch;
   unexpected provider/transform errors remain 500 with sanitized public messages, not false 404s.
   Choose and document HEAD behavior; unsupported methods must not execute document retrieval.
5. Detect overlapping module-owned raw routes and existing explicit `.md` handlers/pages during
   registration. With `rawPrefix: null`, `/blog/one.md` is the module-owned representation, not an
   extra alias; `/blog/one` remains canonical HTML. Root maps to `/index.md`. Avoid a global raw
   catch-all. Do not implement Accept negotiation. Future AI Toolkit aliases must defer to these
   document-owned routes rather than registering competing handlers.

Delivery uses exact per-definition middleware matchers: Nitro 2 treats `:slug.md` as a whole
parameter and cannot register a suffix-constrained route directly. Nonmatching requests pass
through; no prefix-wide catch-all is reserved. Definitions execute only in the compiled Nitro
registry. GET retrieves documents; HEAD and other methods return 405 with `Allow: GET` without
retrieval. Collision checks cover explicit `.md` pages and Nitro handlers when the compiled handler
starts.

Tests: YAML parse round-trip for nested objects/arrays, scalar-looking strings, numeric/boolean/null
values, multiline text, escapes, Unicode and delimiter-like text; empty metadata; every rejected
non-JSON category; one frontmatter block; HTTP MIME/status/method behavior; missing/private items;
baseURL/custom-prefix routes; unrelated routes remain unchanged.

Exit: dynamic public Markdown works and structured utilities retain metadata without YAML reparsing.
Update playground with public sample articles and links; never use privileged live credentials.

## Phase 4 — build-time listing and prerendering (abandoned)

The module owns dynamic document delivery, structured resolution, metadata listing and raw URL
mapping. It does not enumerate build-time routes or orchestrate prerendering. Consumers can supply
concrete `.md` routes through Nuxt/Nitro configuration, route rules and existing discovery modules.
Directus Prerenderer mappers can already return raw Markdown routes alongside HTML routes.

Do not create a second Nitro instance or source-evaluation bridge. Keep the current definition API
and the module independent of Directus Client. Collection-config adapters, shared collection
fetchers and dedicated Markdown URL generation in Directus Prerenderer are not part of this work. AI
Toolkit integration remains optional future work rather than a prerendering prerequisite.

Existing module and definition `prerender` fields remain accepted with no effect to preserve the
current API shape. Document that behavior explicitly rather than promising a later implementation. A
removal or deprecation would need a separate compatibility decision.

## Phase 5 — standalone release readiness

Implementation and documentation are complete. Publishing remains a maintainer action after the
required validation gates are accepted. The module can be released independently before AI Toolkit;
actual Toolkit coexistence is optional follow-up, not a standalone release prerequisite.

- [x] Preserve canonical HTML and neighboring application-owned Markdown routes in standalone Nuxt.
- [x] Exercise default/null and `/raw` prefixes, root mapping, Unicode and non-root app.baseURL.
- [x] Build real Nuxt applications with conflicting `.md` pages and Nitro handlers; assert source
      diagnostics and failed startup for both prefix configurations (`collision-build.test.ts`).
- [x] Validate packed server exports and generic inference with an external TypeScript consumer.
- [x] Extend the packed consumer with parameter routes, nested metadata, private/missing documents,
      sanitized provider failures, method guards, a root document and neighboring raw/HTML routes.
- [x] Keep source definitions out of client JavaScript and inspect tarball contents/private imports.
- [x] Include CHANGELOG.md in the package allowlist alongside built files, README and licence.
- [x] Rewrite README and consumer skill around the current public API and consumer responsibilities.
- [x] Curate the existing concern-specific Changesets so initial release notes do not describe
      already implemented features as planned. Preserve the separate frontmatter-spacing Changeset.

### Acceptance reconciliation with #354

The original issue is a proposal rather than the final contract where later maintainer decisions
changed scope. No-prefix delivery is the default; `/raw` is explicit. Phase 4 was abandoned, so
built-in prerender enablement, enumeration and static-host acceptance are not release requirements.
The accepted module/definition `prerender` fields have no effect. No Directus adapter is included.

| Requirement                                                                                      | Evidence / disposition                                                                                                                        |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Standalone package, no module-owned CMS client or sitemap integration                            | `package.json`, `module.ts`, focused packed consumer installs only the module, its shared utilities and Nuxt                                  |
| Arbitrary source data and inferred non-null transform input                                      | `definition.test.ts`: asynchronous inference; `service.test.ts`: independent local/asynchronous sources; external declaration check           |
| GET plain text with YAML metadata                                                                | `http.test.ts`, `e2e.test.ts`, packed raw-response assertions                                                                                 |
| Nested JSON, scalar types, Unicode, multiline/escaped strings, empty metadata and invalid values | `serialization.test.ts`: round-trip, JSON rejection and whitespace cases                                                                      |
| Single lookup never calls list; null/private content stays unavailable                           | `service.test.ts`: fetch/transform calls and null behavior; `e2e.test.ts` and packed private/missing responses                                |
| Typed metadata listings, ownership and deduplication                                             | `service.test.ts`: metadata-only listing, static ownership, conflicts and sanitized failures                                                  |
| Structured resolution and URL derivation without self-requests                                   | `service.test.ts`, `paths.test.ts`, generated Nitro utility checks in `e2e.test.ts`                                                           |
| Event-free callback support                                                                      | `definition.test.ts`, `service.test.ts`: optional context and event-free resolution/listing; automatic build-time enumeration is out of scope |
| Prefix/baseURL/root routing and ownership                                                        | `paths.test.ts`, `e2e-prefix.test.ts`, `collision-build.test.ts`, default and `--markdown-documents-prefix` packed profiles                   |
| Server-only source and package exports                                                           | `module.test.ts`: server-only imports; packed declaration compiler; client-source scan and packed-package validator                           |
| Built-in global/per-definition prerender scheduling and byte/static-host parity                  | Removed with phase 4. README documents consumer-owned Nitro configuration and deployed MIME verification                                      |
| Optional AI Toolkit discovery/coexistence                                                        | Deferred until its supported public integration exists; not required for standalone delivery                                                  |
| Consumer documentation and compatibility boundaries                                              | Rewritten README and consumer skill; Node 24 baseline and Workers portability documented without an untested deployment claim                 |

### Validation record

Validated on Node 24 with pnpm 11.13.1. Nothing was published or committed.

Passed:

- `corepack pnpm format` and `corepack pnpm lint:fix`.
- `corepack pnpm typecheck` and `corepack pnpm build` across the workspace.
- `corepack pnpm exec vitest run modules/markdown-documents/__tests__`: 12 files, 172 tests.
- `corepack pnpm --filter markdown-documents-playground typecheck` and
  `corepack pnpm --filter markdown-documents-playground build`.
- `corepack pnpm validate:docs` and `corepack pnpm validate:packages`.
- `pnpm_config_verify_deps_before_run=false corepack pnpm pack:packages /private/tmp/markdown-documents-phase5-release '--packages=@onderwijsin/nuxt-module-utils @onderwijsin/nuxt-markdown-documents'`:
  self-contained tarballs and Publint. Inspected the module tarball for built runtime, declarations,
  README, changelog and licence. No application fixtures or private workspace imports are packed.
- `git diff --check`.

- `pnpm_config_verify_deps_before_run=false corepack pnpm validate:external-consumer --packages-dir=/private/tmp/markdown-documents-phase5-release`:
  passed public declarations/inference, server build, client isolation and HTTP/service assertions.
- `pnpm_config_verify_deps_before_run=false corepack pnpm validate:external-consumer --packages-dir=/private/tmp/markdown-documents-phase5-release --markdown-documents-prefix`:
  passed the same checks with `/raw` delivery. Both isolated consumers installed only the packed
  module, packed shared utilities and Nuxt; no AI Toolkit, Agent Discovery or CMS client was needed.

Repository-wide test gate:

- `corepack pnpm test --maxWorkers=2`: **failed** with 11 unhandled
  `EMFILE: too many open files, watch` errors attributed to
  `modules/redirects/__tests__/e2e-dev.test.ts`. Test assertions passed (161 files, 1049 tests; one
  file/four tests skipped), but the command exited 1. Rerun this gate in an environment with
  sufficient file-watcher capacity before release.

The package allowlist change affects no dependency graph. Subsequent pnpm commands use
`pnpm_config_verify_deps_before_run=false` to prevent pnpm 11's automatic pre-script install from
modifying the primary checkout. No dependency install or repair is part of this phase. Workers
deployment and optional AI Toolkit coexistence are not tested here; the existing portability
contract is preserved. Consumer-owned prerendering remains outside module acceptance.

## Post-release follow-up — optional AI Toolkit integration

Once #353 has a public integration surface, add an optional adapter and coexistence fixture in a
separate concern. Let Toolkit consume listing metadata, structured resolution and URL derivation; do
not retrieve every body, pass these documents through mdream, or serialize YAML twice. Test both
module orders and both prefix modes. In null-prefix mode document-owned `.md` routes must win over
Toolkit aliases. Toolkit continues to own negotiation and `nuxt-llms` discovery endpoints. This
follow-up does not delay the standalone release.

## Validation and development workflow

Use the pinned Corepack pnpm version. Never install or repair node_modules in the primary checkout;
use its existing usable installation. If new workspace links are missing and isolation is
unavailable, record the blocker. Dependency changes need exact catalog pins and a synchronized
lockfile; no new runtime library is needed just to create Phase 0.

```sh
pnpm format
pnpm lint:fix
pnpm dev:prepare
pnpm typecheck
pnpm exec vitest run modules/markdown-documents/__tests__
pnpm test
pnpm build
pnpm validate:docs
pnpm validate:packages
pnpm --filter markdown-documents-playground typecheck
pnpm --filter markdown-documents-playground build
pnpm pack:packages /tmp/markdown-documents-artifacts
pnpm validate:external-consumer --packages-dir=/tmp/markdown-documents-artifacts
```

Use a unique temporary artifact directory for each packing run. For focused iteration run the module
build and focused tests first. Before release use the full required gates, including packed
consumers; a passing source test does not prove package resolution. Follow `docs/agent-workflow.md`
for impact reconciliation and the required handoff. Shared utility contracts and maintainer
documentation need changes only if their behavior changes; this plan introduces no such changes.
