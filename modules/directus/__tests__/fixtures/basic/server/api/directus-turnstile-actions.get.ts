export default defineEventHandler(
  (event) => useRuntimeConfig(event).public.directus.auth.turnstile.actions
);
