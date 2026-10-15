---
"@onderwijsin/nuxt-markdown-documents": minor
---

Remove the inert module and document prerender options. Unsupported options now fail validation instead of silently doing nothing. Configure prerender routes in the consuming Nuxt application; built-in prerender orchestration is deferred.
