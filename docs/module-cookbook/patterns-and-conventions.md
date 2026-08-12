# Patterns, conventions, and gotchas

Read this article for every module implementation change. Select the more focused cookbook articles
for package structure, entrypoints, utilities, testing, playgrounds, and consumer documentation.

The cookbook records required and recurring patterns, not every valid pattern. Inspect nearby code
in the same module and comparable modules before adding one. Preserve established behavior unless a
new contract is explicit.

## Design and source ownership

- Prefer small, focused changes and existing conventions over new abstractions.
- Keep presentational behavior in runtime components and reusable logic in composables or focused
  utilities.
- Keep public types in `src/types/` and re-export only intended public APIs.
- Do not change public options, exports, component props, auto-imports, or registration behavior
  without an explicit compatibility decision.
- Do not commit generated files and build artefacts.

## Runtime boundaries and portability

- Import Vue, Nuxt, and framework dependencies explicitly in published runtime files.
- Modules must not read environment variables directly. Consumers pass environment-derived values
  through module configuration instead.
- Use Zod at external boundaries that need runtime validation.
- Preserve Node server and Cloudflare Workers compatibility.
- Declare every runtime import used by published server code directly in `dependencies`, including
  packages such as `h3`, `nitropack`, and `ofetch`. Source exact versions through the workspace
  catalog.
- Import Nitro runtime helpers explicitly from their runtime entrypoints, such as `useStorage` from
  `nitropack/runtime`; do not rely on untyped server auto-imports in published runtime files.

## Network, server, and task behavior

- Use `ofetch` for outbound runtime HTTP requests; do not call native `fetch` directly.
- For server-side caching, use only Nitro's built-in `defineCachedEventHandler` or
  `defineCachedFunction` from `nitropack/runtime`. Do not implement module-level `Map` caches or
  process-local cache variables. Nitro's helpers use configured storage and work across server
  instances. Cache only validated successful results, and keep request-specific validation and rate
  limiting outside the cached function or handler.
- Tasks must be owned by the consuming application. A module may export task handlers and task
  utilities, but the consumer registers task files and schedules them; Nuxt Kit does not currently
  provide a programmatic task-registration API.

## Nuxt-specific decisions

Consult the [official Nuxt documentation router](official-nuxt-documentation.md) before inventing a
workaround, especially for templates, runtime config, app config, modules, auto-imports, components,
plugins, pages, routes, and hooks.

Module setup code accesses typed `nuxt.options` properties directly. We do not use the Reflect API
to interact with `nuxt.options` in the module setup function.
