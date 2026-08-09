# Patterns, conventions, and gotchas

The cookbook records required and recurring patterns, not every valid pattern. Before adding one,
inspect nearby code in the same module and comparable modules; preserve established behavior unless
a new contract is explicit.

- Prefer small, focused changes and existing conventions over new abstractions.
- Keep presentational behavior in runtime components and reusable logic in composables or focused
  utilities.
- Keep public types in `src/types/` and re-export only intended public APIs.
- Import Vue, Nuxt, and framework dependencies explicitly in published runtime files.
- Modules must not read environment variables directly. Consumers pass environment-derived values
  through module configuration instead.
- Use Zod at external boundaries that need runtime validation.
- Use `ofetch` for outbound runtime HTTP requests; do not call native `fetch` directly.
- For server-side caching, use only Nitro's built-in `defineCachedEventHandler` or
  `defineCachedFunction` from `nitropack/runtime`. Do not implement module-level `Map` caches or
  process-local cache variables; Nitro's helpers use the configured storage and work across server
  instances. Cache only validated successful results, and keep request-specific validation and rate
  limiting outside the cached function or handler.
- Declare every runtime import used by published server code directly in `dependencies` (for example
  `h3`, `nitropack`, and `ofetch`) and source exact versions through the workspace catalog.
- Import Nitro runtime helpers explicitly from their runtime entrypoints, such as `useStorage` from
  `nitropack/runtime`; do not rely on untyped server auto-imports in published runtime files.
- Preserve Node server and Cloudflare Workers compatibility.
- Do not change public options, exports, component props, auto-imports, or registration behavior
  without an explicit compatibility decision.
- Do not commit generated files and build artefacts.

Consult Nuxt's official module and Kit documentation before inventing a workaround, especially for
templates, runtime config, app config, modules, auto-imports, components, plugins, pages, routes,
and hooks.
