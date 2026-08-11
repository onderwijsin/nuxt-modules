---
name: nuxt-turnstile
description:
  Use when integrating @onderwijsin/nuxt-turnstile, protecting Nuxt forms or API routes with
  Cloudflare Turnstile, or handling Turnstile token errors.
---

# Nuxt Turnstile

Use `@onderwijsin/nuxt-turnstile` for action-aware Cloudflare Turnstile protection in Nuxt 4. It
automatically registers `@nuxtjs/turnstile` and `@nuxt/ui`; the app still needs its normal Nuxt UI
CSS setup.

## Install and configure

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

Set `NUXT_TURNSTILE_SECRET_KEY` in production rather than exposing the secret in client code. Choose
a stable action per protected operation and validate the same action on the server.

For trusted server-to-server or administrative calls, configure `adminToken` and optionally
`adminHeaderName` (default `x-admin-token`). The shared matcher accepts that header and
`Authorization: Bearer <token>`; never expose the bypass token publicly.

## Frontend implementation

Render `NuxtTurnstile`, wait for a token before submitting, and forward it in the module’s header.
The composable is auto-imported and uses Nuxt UI toast notifications for token failures.

```vue
<script setup lang="ts">
import { TURNSTILE_TOKEN_HEADER } from "@onderwijsin/nuxt-turnstile/runtime";

const token = ref<string>();
const widget = useTemplateRef<{ reset: () => void }>("turnstile");
const { getTokenWithRetry, isEnabled, showMissingTokenErrorHint, captureTurnstileError } =
  useTurnstile();

async function onSubmit() {
  const currentToken = await getTokenWithRetry(); // or getToken();
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

## Backend implementation

Call the helper before performing the protected operation. It reads `x-turnstile-token`, verifies it
with `@nuxtjs/turnstile`, and rejects missing, invalid, unavailable, or mismatched-action tokens.

```ts
import { z } from "zod";
import { assertTurnstileToken } from "@onderwijsin/nuxt-turnstile/runtime";

export default defineEventHandler(async (event) => {
  await assertTurnstileToken(event, "magic-link"); // should use the same key as frontend action
  const body = await readValidatedBody(event, z.object({ email: z.email() }).parse);

  // Only send or mutate data after Turnstile and application validation succeed.
  return await sendMagicLink(body.email);
});
```

Do not import app-specific aliases, bypasses, or Sentry integrations into the module. Apply
authorization and business validation in the consuming route after Turnstile succeeds.

## Troubleshooting

- Empty tokens usually mean the widget has not finished; use `getTokenWithRetry()`.
- Always reset the widget after a processed submission because Turnstile tokens are single-use.
- A `TURNSTILE_ACTION_MISMATCH` response means the frontend and backend action strings differ.
- Cloudflare's official test credentials return `metadata.result_with_testing_key: true` without an
  action. The module accepts only that verified test-key response without action matching.
- In development, a missing secret is allowed so local forms remain usable; production treats it as
  a server misconfiguration.
