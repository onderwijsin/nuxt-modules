# Architecture decisions

Decision records capture accepted repository choices that are easy to lose in implementation detail.
They are binding for the feature they cover until explicitly revisited.

## Records

| Decision                                                                    | Status   | Date       | Scope                                                                 |
| --------------------------------------------------------------------------- | -------- | ---------- | --------------------------------------------------------------------- |
| [Compatibility testing policy](compatibility-testing.md)                    | Accepted | 2026-08-15 | Supported Node, Nuxt, and deployment-runtime validation               |
| [Shared Directus configuration](directus-config.md)                         | Accepted | 2026-08-12 | Directus configuration discovery, schemas, and module composition     |
| [Directus and Nitro error normalization](directus-error-normalization.md)   | Accepted | 2026-08-13 | Directus client error boundary and Nitro validation errors            |
| [Directus sealed session](directus-sealed-session.md)                       | Accepted | 2026-08-13 | Session sealing, rotation, cookies, and runtime boundaries            |
| [Directus session authentication](directus-session-auth.md)                 | Accepted | 2026-08-13 | Directus login, refresh, logout, and session facade                   |
| [Sentry config reads `NITRO_PRESET`](sentry-config-nitro-preset.md)         | Accepted | 2026-08-11 | Sentry module setup and Nitro runtime selection                       |
| [Simple rate limiter](simple-rate-limiter.md)                               | Accepted | 2026-08-11 | Rate-limit guarantees, storage, proxy handling, and security scope    |
| [Static text and Vue I18n compatibility](static-text-i18n-compatibility.md) | Accepted | 2026-08-11 | Static-text translation API and i18n coexistence                      |
| [Zod sensitivity augmentation](zod-sensitive.md)                            | Accepted | 2026-08-12 | Sensitive-field metadata and public Directus configuration projection |

## Create or revisit a decision

Create a record when a choice affects multiple packages, runtime boundaries, security, release
behavior, or future maintenance and cannot be explained adequately in an implementation comment. Use
[`template.md`](template.md), link the decision from the relevant cookbook or workflow article, and
update the index.

When revisiting a record, preserve the old rationale in git history, state the compatibility impact,
and update every affected implementation and consumer document in the same change.
