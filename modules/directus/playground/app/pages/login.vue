<script setup lang="ts">
import { attempt } from "@onderwijsin/nuxt-module-utils";

definePageMeta({
  middleware: () => {
    const auth = useDirectusAuth();
    if (auth.isAuthenticated.value) return navigateTo("/_session");
  }
});

interface LoginForm {
  email: string;
  password: string;
  otp?: string;
}

const auth = useDirectusAuth();
const router = useRouter();
const toast = useToast();
const turnstileLoginAction = useRuntimeConfig().public.directus.auth.turnstile.actions.login;
const turnstile = useTemplateRef<{ reset: () => void }>("turnstile");
const {
  token,
  getTokenWithRetry,
  isEnabled,
  reset,
  showMissingTokenErrorHint,
  captureTurnstileError
} = useTurnstile();
const loginPending = shallowRef(false);
const otpRequired = shallowRef(false);
const fields = computed(() => [
  {
    name: "email",
    type: "email" as const,
    label: "Email",
    placeholder: "you@example.com",
    required: true
  },
  {
    name: "password",
    type: "password" as const,
    label: "Password",
    placeholder: "Your Directus password",
    required: true
  },
  ...(otpRequired.value
    ? [
        {
          name: "otp",
          type: "text" as const,
          label: "One-time password",
          placeholder: "123456",
          description: "Directus requires an MFA code for this login.",
          required: true
        }
      ]
    : [])
]);

async function submitLogin(event: { data: LoginForm }): Promise<void> {
  loginPending.value = true;
  const turnstileToken = await getTokenWithRetry();
  if (isEnabled.value && !turnstileToken) {
    showMissingTokenErrorHint();
    loginPending.value = false;
    return;
  }
  try {
    const result = await attempt(async () => {
      await auth.login(
        {
          email: event.data.email,
          password: event.data.password,
          ...(event.data.otp ? { otp: event.data.otp } : {})
        },
        turnstileToken ? { turnstileToken } : undefined
      );
      await router.push("/_session");
    });
    if (result.error !== null) {
      if (captureTurnstileError(result.error)) return;
      const directusError = useDirectusError(result.error);
      otpRequired.value = directusError.isOtpError;
      toast.add({
        title: directusError.isOtpError ? "Additional verification required" : "Unable to sign in",
        description: directusError.errors[0]?.message ?? "Directus rejected the login request.",
        color: "error"
      });
    }
  } finally {
    loginPending.value = false;
    reset(turnstile.value ?? undefined);
  }
}
</script>

<template>
  <UContainer class="grid gap-8 py-8 lg:grid-cols-[minmax(0,28rem)_1fr]">
    <UPageHeader
      title="Directus login"
      description="Test the module-owned cookie session against the configured Directus instance."
    />

    <UCard class="lg:col-start-1">
      <NuxtTurnstile
        ref="turnstile"
        v-model="token"
        :options="{ action: turnstileLoginAction, appearance: 'interaction-only' }"
        class="mb-4"
      />
      <UAuthForm
        :fields="fields"
        :submit="{
          label: otpRequired ? 'Verify and sign in' : 'Sign in',
          block: true,
          loading: loginPending
        }"
        title="Sign in"
        description="Credentials are sent only to the local Nitro auth route."
        icon="i-lucide-shield-check"
        @submit="submitLogin"
      />
    </UCard>

    <UCard class="lg:col-start-2 lg:row-start-1 lg:row-span-2">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-lock-keyhole" class="size-5 text-primary" />
          <h2 class="font-semibold text-highlighted">What this tests</h2>
        </div>
      </template>
      <ul class="space-y-4 text-sm leading-6 text-muted">
        <li class="flex gap-3">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" />
          The invisible Turnstile widget issues a short-lived token. The login form forwards it only
          to the same-origin Nitro auth route, where the configured login action is verified.
        </li>
        <li class="flex gap-3">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" />
          The auth route rejects cross-origin requests before it reads credentials or changes the
          session.
        </li>
        <li class="flex gap-3">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" />
          Directus exchanges the submitted credentials for access and refresh tokens; they stay in
          the bounded httpOnly session cookie and never enter client state.
        </li>
        <li class="flex gap-3">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" />
          The token-free session snapshot is hydrated into Nuxt state, then available on the current
          session route without another session request.
        </li>
        <li class="flex gap-3">
          <UIcon name="i-lucide-check" class="mt-1 size-4 shrink-0 text-success" />
          Directus MFA errors reveal the OTP field without exposing raw tokens; logout and refresh
          are available from the session route.
        </li>
      </ul>
      <UButton
        class="mt-6"
        to="/_session"
        label="Open current session"
        trailing-icon="i-lucide-arrow-right"
        color="neutral"
        variant="outline"
      />
    </UCard>
  </UContainer>
</template>
