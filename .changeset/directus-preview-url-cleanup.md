---
"@onderwijsin/nuxt-directus-client": patch
---

Remove the captured preview token from the browser URL after mounting using router replacement,
preserving other query parameters and the hash. Client navigation retains the in-memory credential;
reloading the cleaned URL requires reopening the original preview link to restore the credential.
