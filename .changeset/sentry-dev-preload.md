---
"@onderwijsin/nuxt-sentry-config": patch
---

Inject the Node Sentry preload during Rollup output, preserving source maps and avoiding the post-write race that could make Nitro development workers exit with code 0. Retain a single import when Rollup already shares the preload, explicit manual preloading, and the Cloudflare path.
