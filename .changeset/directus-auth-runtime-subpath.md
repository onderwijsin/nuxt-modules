---
"@onderwijsin/nuxt-directus-client": patch
---

Fix a server-runtime startup failure by importing Nitro configuration and storage utilities through
dedicated subpaths instead of the broad `nitropack/runtime` barrel. This prevents the generated
`#nitro-internal-virtual/storage` dependency from being loaded into application runtime code.
