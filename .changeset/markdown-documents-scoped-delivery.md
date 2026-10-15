---
"@onderwijsin/nuxt-markdown-documents": patch
---

Register document delivery as scoped runtime middleware instead of a global document scanner. Remove build-time inspection and collision checks for application pages and server routes. Consumers are responsible for keeping document-owned Markdown URLs distinct from other application routes, assets and modules.
