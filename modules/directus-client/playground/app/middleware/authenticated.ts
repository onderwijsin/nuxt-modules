/**
 * Redirects unauthenticated playground visitors to the Directus login demonstration.
 * @returns A login redirect when no Directus session is active.
 */
export default defineNuxtRouteMiddleware(() => {
  if (!useDirectusAuth().isAuthenticated.value) return navigateTo("/login");
});
