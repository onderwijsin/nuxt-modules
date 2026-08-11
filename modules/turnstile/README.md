# @onderwijsin/nuxt-turnstile

Nuxt 4 integration for action-aware Cloudflare Turnstile protection. The module registers
`@nuxtjs/turnstile` and `@nuxt/ui`, exposes the auto-imported `useTurnstile()` composable, and
provides server helpers for validating single-use Turnstile tokens before a protected operation.

## Installation and configuration

```sh
pnpm add @onderwijsin/nuxt-turnstile
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-turnstile"],
  turnstile: {
    siteKey: process.env.TURNSTILE_SITE_KEY ?? "",
    secretKey: process.env.TURNSTILE_SECRET_KEY ?? ""
  }
});
```

The module's options are:

| Option            | Default           | Purpose                                               |
| ----------------- | ----------------- | ----------------------------------------------------- |
| `enabled`         | `true`            | Enables or disables module setup and its dependencies |
| `siteKey`         | `""`              | Public key used by the Turnstile widget               |
| `secretKey`       | `""`              | Server-only key used for verification                 |
| `adminToken`      | `""`              | Optional trusted token that bypasses verification     |
| `adminHeaderName` | `"x-admin-token"` | Header accepted for `adminToken`                      |

`siteKey` is public and is also passed to `@nuxtjs/turnstile`. Keep `secretKey` and `adminToken`
private. In production, prefer `NUXT_TURNSTILE_SECRET_KEY` for the private runtime value. The
module's dependency registration also requires the consuming app's normal Nuxt UI stylesheet setup.

## Protecting a form

Render `NuxtTurnstile`, choose a stable action for the operation, wait for a token, and forward it
in `x-turnstile-token`. `useTurnstile()` is auto-imported and provides token lifecycle helpers plus
Nuxt UI toast feedback.

```vue
<script setup lang="ts">
import { TURNSTILE_TOKEN_HEADER } from "@onderwijsin/nuxt-turnstile/runtime";

const token = ref<string>();
const widget = useTemplateRef<{ reset: () => void }>("turnstile");
const { getTokenWithRetry, isEnabled, showMissingTokenErrorHint, captureTurnstileError } =
  useTurnstile();

async function onSubmit() {
  const currentToken = await getTokenWithRetry();
  if (isEnabled.value && !currentToken) {
    showMissingTokenErrorHint();
    return;
  }

  try {
    await $fetch("/api/user/session", {
      method: "POST",
      body: { email: "user@example.com" },
      headers: currentToken ? { [TURNSTILE_TOKEN_HEADER]: currentToken } : undefined
    });
  } catch (error) {
    if (!captureTurnstileError(error)) throw error;
  } finally {
    widget.value?.reset();
  }
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <NuxtTurnstile
      ref="turnstile"
      v-model="token"
      :options="{ action: 'magic-link', appearance: 'interaction-only' }"
    />
    <UButton type="submit" label="Send magic link" />
  </form>
</template>
```

Use `getToken()` when the widget is already ready, or `getTokenWithRetry()` when submission may race
with widget initialization. Reset the widget after every processed submission because Turnstile
tokens are single-use.

## Protecting a server route

Call `assertTurnstileToken` before application validation, persistence, delivery, or other protected
work. The expected action must match the widget action.

```ts
import { z } from "zod";
import { assertTurnstileToken } from "@onderwijsin/nuxt-turnstile/runtime";

export default defineEventHandler(async (event) => {
  await assertTurnstileToken(event, "magic-link");
  const body = await readValidatedBody(event, z.object({ email: z.email() }).parse);

  return await sendMagicLink(body.email);
});
```

The helper reads `x-turnstile-token` and verifies it through `@nuxtjs/turnstile`. It rejects
missing, failed, unavailable, or mismatched-action tokens. In development, an absent secret leaves
local forms usable; in production, it produces `TURNSTILE_SERVER_MISCONFIGURED`.

Cloudflare's official test credentials return `metadata.result_with_testing_key: true` without an
`action`. The helper accepts only that verified test-key response without action matching, so test
credentials can exercise protected flows while normal credentials remain action-aware.

## Trusted administrator bypass

Configure `adminToken` for trusted server-to-server or administrative requests. The configured
`adminHeaderName` and `Authorization: Bearer <token>` are both accepted. This bypass is checked
before Turnstile verification; do not expose the token in public runtime config, client code, logs,
or application aliases.

## Runtime exports

The `@onderwijsin/nuxt-turnstile/runtime` subpath is the explicit runtime API and does not require
loading the Nuxt module entrypoint. It exports:

- `TURNSTILE_TOKEN_HEADER` (`"x-turnstile-token"`)
- `assertTurnstileToken`
- `createTurnstileError`
- `createTurnstileErrorData`
- `isErrorWithStatusCode`
- `TurnstileErrorCode` and `TurnstileErrorData` types

Stable error codes are `TURNSTILE_TOKEN_MISSING`, `TURNSTILE_VALIDATION_FAILED`,
`TURNSTILE_ACTION_MISMATCH`, `TURNSTILE_VALIDATION_UNAVAILABLE`, and
`TURNSTILE_SERVER_MISCONFIGURED`. Apply authorization and business validation in the consuming route
after Turnstile succeeds; the module does not replace the route's existing submit or business logic.

## Compatibility

- Nuxt 4
- Node.js 22+
- Node and Cloudflare Workers-compatible server runtime
- No Sentry dependency or telemetry is included

Developed and tested against Node.js 24 and Nuxt 4.5.x. Versions outside the current CI matrix are
not continuously tested. Nuxt 3 is not guaranteed.
