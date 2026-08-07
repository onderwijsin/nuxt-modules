import { assertTurnstileToken } from "@onderwijsin/nuxt-turnstile/runtime";

export default defineEventHandler(async (event) => {
  await assertTurnstileToken(event, "playground");
  return { ok: true };
});
