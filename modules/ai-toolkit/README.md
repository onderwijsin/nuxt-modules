# @onderwijsin/nuxt-ai-toolkit

Barebones scaffold for the AI Toolkit proposed in
[issue #353](https://github.com/onderwijsin/nuxt-modules/issues/353). This version registers a Nuxt
module and does not change application behavior. It does not install Agent Discovery, convert HTML,
register Markdown routes, or expose server utilities.

## Registration

Requires Node.js 24 or newer and Nuxt 4. The package is under development; the example assumes it is
available in your application's dependencies.

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-ai-toolkit"]
});
```

There are no functional module options yet. `aiToolkit.routes`, `rawPrefix`,
`routeRules.ai.markdown`, and `htmlToMarkdown()` are planned APIs, not available in this scaffold.
See [IMPLEMENTATION.md](./IMPLEMENTATION.md) for the researched design, integration gates, and
phases.

## Planned scope

Opt selected HTML pages into mdream conversion through `aiToolkit.routes` or
`routeRules.ai.markdown: true`. A resolved explicit `false` takes precedence over the routes option.
Agent Discovery will own Markdown negotiation, aliases, and discovery endpoints. Directus will not
be required; MCP Toolkit will remain optional with application-owned tools.

Prerendered HTML can bypass server negotiation. The implementation will document CDN/reverse-proxy
configuration or avoiding prerendering for negotiated pages; explicit Markdown URLs must still work.
These capabilities are not implemented in this version.
