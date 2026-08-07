---
name: nuxt-newsletter-signup
description:
  Use when integrating @onderwijsin/nuxt-newsletter-signup, configuring Loops or Mailchimp
  newsletter signup, or handling its normalized client errors.
---

# Nuxt newsletter signup

Use `@onderwijsin/nuxt-newsletter-signup` for a provider-independent newsletter signup endpoint. It
supports Loops and Mailchimp through server-side HTTP requests and does not expose provider SDKs or
API keys to the browser.

## Configuration

For a locally registered handler, the consumer must provide `provider`, `apiKey`, and either
`lists.default` or `lists.options`. The API key is used only by the server runtime and is never
exposed to the client. Remote-endpoint mode does not need provider credentials in this application.

Loops with one mailing list:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  newsletterSignup: {
    provider: "loops",
    apiKey: "your-loops-api-key",
    lists: { default: "loops-mailing-list-id" },
    fields: {
      firstName: { required: true },
      lastName: { required: false },
      organization: { required: false }
    }
  }
});
```

Mailchimp with audience-specific servers:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-newsletter-signup"],
  newsletterSignup: {
    provider: "mailchimp",
    apiKey: "your-mailchimp-api-key",
    lists: {
      options: [
        { label: "Product updates", id: "audience-a", server: "us4" },
        { label: "Events", id: "audience-b", server: "us5" }
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

When Mailchimp is used, each audience option should contain its own `server` value. The selected
option’s server is used for the request. A top-level `server` can be used as a fallback when one
server applies to a single audience or to all configured audiences. `us4` and `us5` are examples.

## Local or remote endpoint

The default configuration registers the local `POST /api/newsletter/signup` handler:

```ts
newsletterSignup: {
  provider: "loops",
  apiKey: "your-loops-api-key",
  endpoint: {
    enabled: true,
    url: "/api/newsletter/signup"
  },
  lists: { default: "loops-mailing-list-id" }
}
```

To use a handler registered by another Nuxt application, disable local registration and configure
the remote URL:

```ts
newsletterSignup: {
  endpoint: {
    enabled: false,
    url: "https://newsletter-api.example.com/api/newsletter/signup"
  }
}
```

This still provides `useNewsletterSignup()`; it only prevents this module from registering its local
server route. The remote URL must accept the same request payload and return the same normalized
error contract.

For multiple selectable lists or audiences:

```ts
lists: {
  options: [
    { label: "Product updates", id: "product-updates" },
    { label: "Events", id: "events" }
  ];
}
```

For Mailchimp, include the server with each audience option:

```ts
lists: {
  options: [
    { label: "Product updates", id: "audience-a", server: "us4" },
    { label: "Events", id: "audience-b", server: "us5" }
  ];
}
```

The submitted `listId` is validated against these options. Configure `lists.default` as well when
the form should have a fallback selection.

List labels and IDs are exposed through `useRuntimeConfig().public.newsletterSignup.lists` for
client-side selectors. Provider credentials and Mailchimp server values are not exposed.

## Supported payload

Only these fields are supported:

```ts
{
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  source?: string;
  listId?: string;
}
```

`source` defaults to `"api"`. Loops stores it as the contact source; Mailchimp stores it as a member
tag. Additional fields require a custom consumer endpoint.

## Client usage

`useNewsletterSignup()` is auto-imported. Its `signup` function wraps the generated
`POST /api/newsletter/signup` endpoint:

```vue
<script setup lang="ts">
const { signup, handleSignupError } = useNewsletterSignup();

async function submit() {
  try {
    await signup({
      email: "person@example.com",
      firstName: "Ada",
      source: "homepage"
    });

    // Custom success behavior.
  } catch (error) {
    handleSignupError(error);
  }
}
</script>
```

For a selectable list, include the validated option ID:

```ts
await signup({
  email: "person@example.com",
  listId: "events"
});
```

`handleSignupError` uses Nuxt UI toasts with Dutch messages. Use the returned helpers for custom UI:

```ts
const { signup, getErrorCode, isAlreadyExistsError, handleSignupError, ERROR_CODES } =
  useNewsletterSignup();

try {
  await signup(payload);
} catch (error) {
  if (isAlreadyExistsError(error)) {
    showAlreadySubscribedMessage();
  } else if (getErrorCode(error) === ERROR_CODES.invalidInput) {
    showInvalidInputMessage();
  } else {
    handleSignupError(error);
  }
}
```

The normalized statuses are `400` for invalid input, `429` for an already subscribed email when
reported by the provider, `500` for incomplete module configuration, and `5xx` for provider/server
failures.
