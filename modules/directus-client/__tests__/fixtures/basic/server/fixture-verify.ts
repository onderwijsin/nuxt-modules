export async function verifyTurnstileToken(token: string) {
  const actions: Record<string, string> = {
    "directus-login": "directus-login",
    "directus-password-request": "directus-password-request",
    "directus-magic-link-request": "directus-magic-link-request",
    "directus-action-mismatch": "other-action"
  };
  return { success: true, action: actions[token] };
}
