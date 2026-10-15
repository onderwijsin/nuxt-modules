# AI Toolkit implementation plan

## Scope and current state

Implement [issue #353](https://github.com/onderwijsin/nuxt-modules/issues/353) as
`@onderwijsin/nuxt-ai-toolkit` in `modules/ai-toolkit`. This change supplies an inert module
entrypoint, metadata tests, isolated playground, consumer fixture layer, README, consumer skill, and
Changeset. All feature phases below remain unimplemented. The package starts at `0.0.0`; its initial
Changeset describes the scaffold only.

Deliver a small integration of Agent Discovery with mdream, independently useful without Directus.
Agent Discovery owns negotiation, `.md` aliases, the configurable raw prefix, and discovery output.
The toolkit owns public HTML selection, safe HTML acquisition, conversion, and its content adapter.
Do not install AI Ready or `@mdream/nuxt`, implement another MCP server, add a provider registry,
automatically enumerate pages, build a search/index database, or capture SSR output in v1.

## Research baseline

Inspected upstream source snapshots on 15 October 2026. These are repository HEAD snapshots, not
proof of registry availability or compatibility with our pinned Nuxt 4.5.2 / Nitro 2.13.4 graph.
Recheck releases and exact compatible versions before adding dependencies.

| Repository                                                               | Inspected commit                           | Relevant source                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Agent Discovery](https://github.com/benjamincanac/nuxt-agent-discovery) | `5abab5d8a1fde6cfdcdd3b24e5375df96261fa1f` | [`src/module.ts`](https://github.com/benjamincanac/nuxt-agent-discovery/blob/5abab5d8a1fde6cfdcdd3b24e5375df96261fa1f/src/module.ts), `runtime/shared/types.ts`, `shared/negotiation.ts`, `server/utils/document.ts`, `server/utils/pages.ts`, `server/routes/raw.ts` |
| [AI Ready](https://github.com/harlan-zw/nuxt-ai-ready)                   | `4453134230fb9e34e09b10d15c2f209a8baf1af0` | [`src/module.ts`](https://github.com/harlan-zw/nuxt-ai-ready/blob/4453134230fb9e34e09b10d15c2f209a8baf1af0/src/module.ts), `src/types.ts`, runtime Markdown middleware and Cloudflare routing utilities                                                               |
| [mdream](https://github.com/harlan-zw/mdream)                            | `a7a88026a221126b7e21c579ed41dd2ebb6cb809` | [`packages/mdream/package.json`](https://github.com/harlan-zw/mdream/blob/a7a88026a221126b7e21c579ed41dd2ebb6cb809/packages/mdream/package.json), `src/index.ts`, `src/edge.ts`, `src/resolve-options.ts`, `packages/nuxt/src/module.ts`                              |

### Findings that determine the design

- Agent Discovery's manifest reports `0.7.1`. Its public `AgentContentSource` has required
  `get(route, event)` and optional `list(selector, event)` / `firstLeaf(route, event)`. `get`
  returns `{ markdown, title?, description?, updatedAt? }` or `null`. Configure an absolute source
  file through `agentDiscovery.source`; the module resolves it into `#agent-discovery/source`. Use
  this supported adapter seam rather than replacing its raw handler or internal aliases.
- Agent Discovery uses a positive pattern table for negotiation. It does not consume
  `routeRules.ai.markdown`. Supplying `routes: ['/blog/**']` alone cannot express a more specific
  negative rule. Guarding only source `get()` would still negotiate a disabled HTML page into a 404.
  Negotiation, source retrieval, listing, and deployment rewrites must agree before shipping.
- Its route matcher gives `**` its own semantics (documented as one or more segments). Do not assume
  these equal Nitro wildcard and merge semantics, particularly the `/blog` base path.
- Its document resolver generates a homepage when `get('/')` returns `null`. That is incompatible
  with treating an excluded/missing homepage as unavailable. Root exclusion must prevent this
  fallback through a supported upstream mechanism; disabled and missing root tests are mandatory.
- Agent Discovery can detect consumer-owned raw handlers and avoid freezing their dynamic twins.
  This does not automatically register those documents in its source listing. A custom source is
  singular, so composition with existing content sources requires an explicit compatibility
  decision.
- `llms.txt` is provided through its optional `nuxt-llms` bridge, not by the custom source alone.
  Decide installation/configuration ownership in phase 1; do not promise it without that bridge.
- MCP Toolkit is optional upstream, with peer range `>=0.19.0`; it is detected after modules
  install. Keep the application responsible for its MCP tools and endpoint.
- mdream's manifest reports `2.0.3`. The current direct API is synchronous
  `htmlToMarkdown(html, options): string`, with `MdreamOptions` such as `minimal`, `clean`,
  `origin`, `frontmatter`, and `filter`. Older plugin-oriented examples are not the current API
  contract.
- The mdream default Node entrypoint imports NAPI bindings. `workerd` and `edge-light` export
  conditions select its WASM implementation. Callback-bearing options cannot be serialized into
  runtime config. Package and deployment validation must exercise the real converter, not a mock.
- AI Ready handles conversion, prerendering, static response headers, caching, database-backed
  features, MCP integration, and platform routing. Its Nitro setup externalizes mdream on Node and
  enables WASM on edge presets. These are useful packaging references, not justification to copy its
  wider architecture, Nitro 3 casts, database, or hosting configuration.

## Proposed consumer contract (not implemented)

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-ai-toolkit"],
  aiToolkit: {
    routes: ["/", "/blog", "/about"],
    rawPrefix: "/raw"
  },
  routeRules: {
    "/about": { ai: { markdown: false } },
    "/contact": { ai: { markdown: true } }
  }
});
```

Reserve `ai` for future route-level features, but expose only `markdown?: boolean` in v1. Use
`routes`, never `htmlRoutes`. Default to an empty route list so installation does not export all
pages. Propose `/raw` as the default prefix and `mdreamOptions` for serializable module-level
converter overrides; confirm the allowed options and normalization during phase 1. The standalone
server utility may accept the supported mdream callback options directly.

Resolve rules against the canonical HTML path and apply exactly:

```ts
const markdownEnabled = resolvedRouteRules.ai?.markdown ?? matchesRoutes(canonicalPath);
```

| Input                                         | Expected result                 |
| --------------------------------------------- | ------------------------------- |
| Listed route, missing `ai.markdown`           | Enabled                         |
| Unlisted route, explicit `true`               | Enabled                         |
| Listed route, explicit `false`                | Disabled                        |
| Unlisted route, no rule                       | Disabled                        |
| Broad true rule with more specific false rule | Disabled at that canonical path |
| Broad false rule with more specific true rule | Enabled at that canonical path  |

`/` maps to `/index.md` and `/raw/index.md`; `/blog` maps to `/blog.md` and `/raw/blog.md`. Keep
canonical HTML behavior intact. Independently served Markdown is not HTML input to mdream. Do not
advertise a representation unless selection and availability both permit it.

## Phase 1 — Prove the upstream integration and freeze compatibility

**Depends on:** scaffold. **Deliverable:** a small fixture-backed integration spike and a documented
supported-version/API decision before feature implementation proceeds.

- Select published Agent Discovery and mdream versions compatible with the workspace graph. Compare
  their published artifacts to the inspected snapshots (Agent Discovery HEAD uses newer Nuxt Kit).
  Use exact catalog pins, respect release-age policy, and install only in an isolated checkout.
- Declare Agent Discovery as an application-owned peer with an exact development catalog pin; use
  `moduleDependencies` for registration/version checks and documented configuration ownership.
  mdream is a normal runtime dependency. Do not add MCP Toolkit as a required dependency.
- Prove source-path configuration before Agent Discovery setup, independent of consumer module
  order. Preserve consumer discovery settings; reject conflicting custom source or raw-prefix
  configuration with a clear diagnostic instead of silently replacing it.
- Demonstrate one shared effective-selection policy reaching upstream negotiation and deployment
  rewrites as well as `get()` and `list()`. Check late `nitro:config` rules and merged wildcard
  rules. Positive-only patterns are insufficient for a wildcard with a negative exception.
- Demonstrate a disabled or missing `/` cannot generate the upstream fallback index or appear in
  discovery. Also check the generated homepage's blanket claim about all pages being Markdown.
- If these contracts require upstream changes, propose the smallest supported selection/availability
  extension upstream and require a compatible published release. Do not patch private aliases, copy
  upstream handlers, or add competing middleware as a workaround. Record the blocker and seek a
  maintainer decision if the upstream API cannot meet issue #353.
- Decide whether the optional `nuxt-llms` bridge is required for this module's default discovery
  promise or is consumer-installed; document and test the selected behavior and dependency metadata.

**Exit gate:** an executable proof covers wildcard exclusion, rule-only opt-in, root exclusion, root
404, source registration order, and unchanged consumer MCP tools. Do not treat the full MVP as
implementable until the upstream gaps are resolved.

## Phase 2 — Options, canonical selection, and public declarations

**Depends on:** phase 1. **Deliverable:** one canonical route-selection implementation.

- Add `src/types/options.ts`, a Zod boundary schema in `src/config/`, and focused shared runtime
  selection helpers. Reuse module-utils public subpaths, `attempt`, guards, and typed-object helpers
  where their documented semantics apply. Keep `src/module.ts` orchestration-only.
- Validate route patterns and raw prefixes as site-relative paths; reject external URLs, unsafe
  traversal, reserved handler collisions, and malformed values. Define trailing slash, encoded path,
  application base URL, and query handling once. Avoid decoding twice.
- Use Nitro's supported resolver for merged runtime route rules against a canonical-path event;
  never resolve against the incoming raw alias or hand-roll specificity ordering. Preserve the
  distinction between missing and explicit `false`.
- Register self-contained public Nuxt/Nitro route-rule declarations and the supported resolved-rule
  type where needed. Include them during prepare; verify Nuxt config and server inference without
  assertions, global stubs, or importing unpublished source types.
- Derive a finite candidate list from exact `routes` entries and exact enabled rule keys only.
  Patterns control matching, never enumeration. Deduplicate normalized canonical paths.

**Exit gate:** unit tests cover the truth table, wildcard merges, base paths, slash/encoding edges,
and reserved paths; consumer typechecks accept booleans and reject invalid rule types.

## Phase 3 — Portable conversion and safe HTML acquisition

**Depends on:** phase 2. **Deliverable:** a server-only `htmlToMarkdown` utility and adapter input.

- Publish `@onderwijsin/nuxt-ai-toolkit/server` from an explicit runtime entrypoint, including
  emitted declarations. Wrap mdream directly with documented sensible defaults and per-call
  overrides. Propose `minimal: true` with frontmatter controlled to avoid duplicate upstream
  frontmatter; prove title, description, links, tables, and code fidelity with real converter
  fixtures.
- Limit configured defaults to serializable supported Markdown-output options; do not let an option
  silently switch representations to plain text or HTML. Keep per-call callbacks server-side.
- Fetch canonical HTML internally with Nitro's local request facilities and explicit
  `Accept: text/html` plus a neutral user agent. Use a fresh allowlisted header set: never copy
  cookies, Authorization, client host overrides, or other user credentials into public exports.
  Derive canonical origin from trusted site configuration where possible.
- Permit only selected canonical site paths; reject raw/Markdown aliases as source paths. Bound work
  with a timeout and response-size policy. Disable automatic external redirects; define safe
  same-site redirects and a finite redirect limit, or report a deliberate unsupported response.
- Validate success status and HTML content type before conversion. Preserve genuine 404s; map
  upstream failures and non-HTML responses to meaningful errors, never empty successful Markdown.
  Define empty-conversion behavior explicitly and exclude unavailable documents from listing.
- Verify Nitro Node tracing/externalization retains mdream's native binding. Verify Workers resolves
  WASM without Node-only imports and enable only packaging settings demonstrated necessary by
  builds.

**Exit gate:** converter tests exercise defaults and overrides; acquisition tests cover credential
isolation, loop prevention, redirects, missing pages, failed responses, non-HTML, and limits.

## Phase 4 — Content source, negotiation, and truthful discovery

**Depends on:** phases 1–3. **Deliverable:** the MVP public routes and discovery behavior.

- Export the built-in source as an `AgentContentSource` using the upstream public type. `get()`
  selects first, acquires HTML, converts, and returns metadata. Ordinary unselected paths return
  `null`, with the root behavior protected by the phase-1 solution. No `firstLeaf` directory
  fallback is needed for this HTML adapter.
- `list()` uses the finite candidates from phase 2, reapplies effective rules, and verifies source
  availability. Only supported, available concrete paths reach sitemap/llms output. Return `null`
  for unsupported selectors. Bound candidate work; introduce no process-local cache or full index.
- Connect the same policy to the supported upstream negotiation seam, including any deployment
  rewrite integration established in phase 1. Do not register raw handlers in the toolkit.
- Exercise exact root mapping, custom raw prefix, canonical/alternate headers, query behavior,
  `Accept` negotiation, and upstream caching/Vary behavior without duplicating URL construction.
- Prove coexistence with a fixture-owned independent Markdown route. Its handler retains ownership;
  it is neither converted nor listed unless explicitly integrated through supported upstream APIs.
  Do not build a generic source-composition registry in v1.

**Exit gate:** real Nuxt fixture requests show the issue's root/blog/about/contact examples,
wildcard exceptions, real 404s, preserved HTML/API responses, and truthful discovery output.

## Phase 5 — Consumer evidence, documentation, and release readiness

**Depends on:** phase 4. **Deliverable:** verified artifacts and synchronized consumer guidance.

- Expand package-owned tests and the playground with selected HTML pages, wildcard examples,
  explicit false overrides, rule-only opt-in, a non-HTML endpoint, and a missing path. Use private
  `test-utils` helpers for Nuxt fixtures and request helpers from the same package instance.
- Expand the external-consumer layer to import the published server subpath, convert real HTML, and
  assert built route responses. The current scaffold layer proves module registration only.
- Keep MCP absent in the basic fixture. Add a focused optional integration fixture with MCP Toolkit
  `>=0.19.0` and a consumer-defined tool; verify the tool still works and no duplicate server
  exists.
- Document registration, both interchangeable opt-in methods, false precedence, concrete-only
  listing, converter defaults/overrides, source ownership, errors, and optional integrations in the
  README and `skills/nuxt-ai-toolkit/SKILL.md`. Update the root package table as functionality
  lands.
- Explain that static prerendered HTML may bypass negotiation on Coolify/Nitro. Consumers configure
  their CDN/reverse proxy or avoid prerendering affected HTML; explicit Markdown URLs must work.
  Document upstream cached-route negotiation limits too. Do not manage hosting infrastructure.
- Add JSDoc for public options/utilities, inspect emitted files and declarations, and add one
  Changeset per concern describing implemented behavior rather than planned features.

Run from the repository root in an isolated installation, using the pinned package manager
(`corepack pnpm` for agent-run commands):

```sh
pnpm format
pnpm lint:fix
pnpm dev:prepare
pnpm exec vitest run modules/ai-toolkit/__tests__
pnpm --filter @onderwijsin/nuxt-ai-toolkit typecheck
pnpm --filter ai-toolkit-playground typecheck
pnpm --filter ai-toolkit-playground build
pnpm typecheck
pnpm test
pnpm build
pnpm validate:docs
pnpm validate:packages
pnpm pack:packages /tmp/ai-toolkit-artifacts
pnpm validate:external-consumer --packages-dir=/tmp/ai-toolkit-artifacts
```

Use a fresh artifact directory per run. Include a focused Workers production-build/conversion smoke
check for mdream's WASM path; Node-only tests do not prove Workers portability. Record exact
commands and blockers. Never modify the primary checkout's `node_modules`, override the configured
pnpm store, commit generated output, or start a browser manually to validate the module.

**Exit gate:** issue acceptance criteria have passing runtime/type/package evidence, optional MCP
coexists, docs and consumer skill match shipped behavior, and all blockers are resolved or
explicitly reported before claiming release readiness.
