# @onderwijsin/nuxt-newsletter-signup

> Compatibility note: developed and tested against Node.js 24 and Nuxt 4.5.x. The package declares
> Node.js >=22 and may work with other Nuxt versions allowed by its package metadata, but versions
> outside the current CI matrix are not continuously tested; Nuxt 3 is not guaranteed.

Provider-independent newsletter signup for Nuxt 4. The module exposes one server endpoint and
normalizes Loops and Mailchimp into the same request and error contract. Provider credentials and
provider requests stay on the server; the browser only calls the generated Nuxt endpoint.

## Installation

```sh
pnpm add @onderwijsin/nuxt-newsletter-signup
```

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  newsletterSignup: {
    provider: "loops",
    apiKey: "your-loops-api-key",
    lists: {
      default: "your-loops-mailing-list-id"
    },
    fields: {
      firstName: { required: true },
      lastName: { required: false },
      organization: { required: false }
    }
  }
});
```

The consumer must provide `apiKey`. It is used by the server runtime and is never exposed to the
client. The module does not choose, load, or manage credentials for the consumer.

When using Mailchimp, provide the `server` value associated with each configured audience. A
top-level `server` is available as a fallback for a single audience or configurations where all
audiences share one server. For example:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  newsletterSignup: {
    provider: "mailchimp",
    apiKey: "your-mailchimp-api-key",
    lists: {
      default: "audience-a",
      options: [
        { label: "Nieuwsbrief A", id: "audience-a", server: "us4" },
        { label: "Nieuwsbrief B", id: "audience-b", server: "us5" }
      ]
    },
    fields: {
      firstName: { required: true, target: "FNAME" },
      lastName: { target: "LNAME" },
      organization: { target: "ORG" }
    }
  }
});
```

For Mailchimp, `server` belongs to the audience configuration. The selected list option’s server is
used for that request; `us4` and `us5` are only examples.

### Cloudflare Workers

The Mailchimp adapter uses Node’s `node:crypto` API to calculate the subscriber hash. Cloudflare
Workers deployments must enable the `nodejs_compat` compatibility flag in the
[Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/). Nuxt
applications running on Workers already require this flag. Cloudflare also enables
`nodejs_compat_v2` when the compatibility date is `2024-09-23` or later; see the
[Cloudflare Node.js compatibility documentation](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/).

## Local or remote endpoint

By default, the module registers its local server handler at `POST /api/newsletter/signup` and the
composable calls that path. This is the normal setup:

```ts
newsletterSignup: {
  provider: "loops",
  apiKey: "your-loops-api-key",
  endpoint: {
    enabled: true
  },
  lists: { default: "your-list-id" }
}
```

The local route is always `/api/newsletter/signup`; `endpoint.url` is ignored while local
registration is enabled. Consumers that already have the handler in another Nuxt application can
disable local handler registration and point the composable at that application instead:

```ts
newsletterSignup: {
  endpoint: {
    enabled: false,
    url: "https://newsletter-api.example.com/api/newsletter/signup"
  }
}
```

With `enabled: false`, this module still registers `useNewsletterSignup()` but does not register
`POST /api/newsletter/signup`. The `url` may be a relative path or an HTTP(S) URL. A remote endpoint
must implement the same request and error contract. Provider options are not needed in the consuming
application when it only uses the remote endpoint.

## Lists

For a form that always subscribes to one list, configure `lists.default` and omit `listId` from the
request:

```ts
lists: {
  default: "newsletter-main"
}
```

When only `lists.default` is configured, the endpoint always uses that server-owned list and rejects
any client-supplied `listId`.

For a form that lets the visitor choose a list, configure `lists.options`. Each submitted `listId`
must match one of the configured option IDs:

```ts
lists: {
  options: [
    { label: "Nieuwsbrief A", id: "audience-a" },
    { label: "Nieuwsbrief B", id: "audience-b" }
  ];
}
```

For Mailchimp, add the server for each audience option:

```ts
lists: {
  options: [
    { label: "Nieuwsbrief A", id: "audience-a", server: "us4" },
    { label: "Nieuwsbrief B", id: "audience-b", server: "us5" }
  ];
}
```

You may configure both `default` and `options`. In that case, omitting `listId` uses `default`,
while a supplied `listId` must still be present in `options`.

Configured list labels and IDs are also available through
`useRuntimeConfig().public.newsletterSignup` for client-side list selectors. Provider credentials
and Mailchimp server values remain server-only.

## Supported fields and mapping

The generated endpoint accepts only these fields:

```ts
interface NewsletterSignupPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  source?: string;
  listId?: string;
}
```

The provider defaults are:

| Input          | Loops            | Mailchimp       |
| -------------- | ---------------- | --------------- |
| `email`        | `email`          | `email_address` |
| `firstName`    | `firstName`      | `FNAME`         |
| `lastName`     | `lastName`       | `LNAME`         |
| `organization` | `organization`   | `ORG`           |
| `source`       | contact `source` | member tag      |

`source` defaults to `"api"` when omitted. Loops receives it as the contact source. Mailchimp
receives it as `tags: [source]`, not as a merge field.

Use `fields.*.target` to override provider property names for the configurable contact fields:

```ts
fields: {
  firstName: { required: true, target: "FIRST_NAME" },
  lastName: { target: "LAST_NAME" },
  organization: { target: "COMPANY" }
}
```

`required` controls server-side request validation. Consumer-side form validation is still
recommended for immediate feedback. Fields beyond the supported set require a consumer-owned custom
endpoint.

## Endpoint

The module generates `POST /api/newsletter/signup`.

The local endpoint uses `@onderwijsin/nuxt-simple-rate-limiter`: each IP may make five requests per
minute and is then banned for 15 minutes. Rate-limit failures are normalized as `rateLimited` errors
and include `bannedUntil`. It does not configure or override other application rate limits. The
limiter is not registered when `endpoint.enabled` is `false`. Configure Nitro storage for
production; use a shared driver such as Redis when the application runs on multiple instances.
Duplicate subscriptions are idempotent and always return success, so the endpoint does not reveal
mailing-list membership. Provider requests have a five-second timeout. Mailchimp uses immediate
`subscribed` status.

Without persistent Nitro storage, the rate limiter works in memory but its counters and bans reset
when the application restarts. To persist them for a single-instance deployment, configure storage:

```ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      "newsletter-signup": { driver: "fs", base: "./newsletter-signup" }
    }
  }
});
```

Use a shared storage driver such as Redis for multiple application instances.

Single-list request:

```ts
await $fetch("/api/newsletter/signup", {
  method: "POST",
  body: {
    email: "person@example.com",
    firstName: "Ada",
    source: "homepage"
  }
});
```

Multi-list request:

```ts
await $fetch("/api/newsletter/signup", {
  method: "POST",
  body: {
    email: "person@example.com",
    firstName: "Ada",
    listId: "audience-b"
  }
});
```

Consumers normally use `useNewsletterSignup()` instead of calling the endpoint directly.

## Client composable

`useNewsletterSignup()` is auto-imported and provides the `signup` ofetch wrapper together with
standardized client-side error handling:

```vue
<script setup lang="ts">
const { signup, handleSignupError } = useNewsletterSignup();

const form = {
  email: "person@example.com",
  firstName: "Ada",
  source: "homepage"
};

async function submit() {
  try {
    await signup(form);
    // Custom success behavior, for example showing a confirmation state.
  } catch (error) {
    handleSignupError(error);
  }
}
</script>
```

`handleSignupError` uses Nuxt UI toasts with Dutch messages:

- Invalid input: `Ongeldige invoer`
- Provider or server failure: `Er ging iets mis, probeer het nog een keer`

For custom handling, use the helpers returned by the composable:

```ts
const { signup, getErrorCode, handleSignupError, ERROR_CODES } = useNewsletterSignup();

try {
  await signup(payload);
  showSuccessMessage();
} catch (error) {
  if (getErrorCode(error) === ERROR_CODES.invalidInput) {
    showValidationMessage();
  } else {
    handleSignupError(error);
  }
}
```

## Error contract

The endpoint normalizes provider failures into these client-facing HTTP statuses:

| Status | Meaning                                                                                                 |
| ------ | ------------------------------------------------------------------------------------------------------- |
| `400`  | Invalid request or invalid configured list selection                                                    |
| `429`  | Rate limited by the local endpoint's abuse protection; `data.bannedUntil` is present for an active ban. |
| `500`  | Module configuration is incomplete                                                                      |
| `5xx`  | Provider or server failure                                                                              |

The API key is never returned in endpoint responses or exposed through public runtime config.

The `@onderwijsin/nuxt-newsletter-signup/runtime` export is browser-safe. Server error helpers are
available from `@onderwijsin/nuxt-newsletter-signup/runtime/server`.
