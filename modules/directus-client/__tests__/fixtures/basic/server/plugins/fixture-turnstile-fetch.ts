import { defineNitroPlugin } from "nitropack/runtime";

const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const actions: Record<string, string> = {
  "directus-login": "directus-login",
  "directus-password-request": "directus-password-request",
  "directus-magic-link-request": "directus-magic-link-request",
  "directus-action-mismatch": "other-action"
};

/** Intercepts the local fixture's outbound Turnstile verification requests. */
export default defineNitroPlugin(() => {
  const fetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    if (String(input) !== endpoint) return fetch(input, init);

    const token = new URLSearchParams(String(init?.body)).get("response");
    return Response.json({
      success: true,
      hostname: "fixture.example",
      "error-codes": [],
      action: token ? actions[token] : undefined
    });
  };
});
