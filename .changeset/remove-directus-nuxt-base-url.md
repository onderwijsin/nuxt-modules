---
"@onderwijsin/nuxt-directus-client": patch
"@onderwijsin/nuxt-directus-config": patch
---

Remove the temporary `client.nuxtBaseUrl` option from the Directus client and shared Directus
configuration schemas.

Authentication no longer needs an application base URL because SSR operations execute through the
request-bound server bridge, while browser operations continue to use relative same-origin proxy
paths. Consumers should remove `client.nuxtBaseUrl` from their configuration.
