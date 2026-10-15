---
name: nuxt-ai-toolkit
description:
  Register the Onderwijs in AI Toolkit scaffold and understand which agent features are still
  planned.
---

# AI Toolkit

Requires Node.js 24 or newer and Nuxt 4. This package is a scaffold, not a working Markdown or
discovery integration. When the package is available in the application's dependencies, register it:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-ai-toolkit"]
});
```

Registration currently has no runtime effects or functional options. Do not configure
`aiToolkit.routes`, `rawPrefix`, or `routeRules.ai.markdown`, or import `htmlToMarkdown()` yet. Do
not claim `.md` URLs, `/raw` routes, discovery documents, or MCP integration are available.

The planned module will convert selected public HTML pages with mdream and integrate Agent
Discovery. Explicit resolved route rules will override route selection, including `false`. Directus
will not be required, and MCP Toolkit will remain optional with consumer-owned tools. Prerendered
HTML may need CDN/reverse-proxy negotiation or exclusion from prerendering. Consult the package
README and implementation plan for the future contract; none of these planned features exists in the
scaffold.
