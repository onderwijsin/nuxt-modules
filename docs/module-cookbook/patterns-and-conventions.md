# Patterns, conventions, and gotchas

The cookbook records required and recurring patterns, not every valid pattern. Before adding one,
inspect nearby code in the same module and comparable modules; preserve established behavior unless
a new contract is explicit.

- Prefer small, focused changes and existing conventions over new abstractions.
- Keep presentational behavior in runtime components and reusable logic in composables or focused
  utilities.
- Keep public types in `src/types/` and re-export only intended public APIs.
- Import Vue, Nuxt, and framework dependencies explicitly in published runtime files.
- Use Zod at external boundaries that need runtime validation.
- Preserve Node server and Cloudflare Workers compatibility.
- Do not change public options, exports, component props, auto-imports, or registration behavior
  without an explicit compatibility decision.
- Do not commit generated files and build artefacts.

Consult Nuxt's official module and Kit documentation before inventing a workaround, especially for
templates, runtime config, app config, modules, auto-imports, components, plugins, pages, routes,
and hooks.
