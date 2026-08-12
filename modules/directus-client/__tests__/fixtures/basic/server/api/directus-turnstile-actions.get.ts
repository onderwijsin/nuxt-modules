export default defineEventHandler(
  (event) => useRuntimeConfig(event).public.directusClient.auth.turnstile.actions
);
