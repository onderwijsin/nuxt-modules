import { defineNitroPlugin } from "nitropack/runtime";

const endpoint = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const headers = { "content-type": "application/json" };
const verifiedResponse = { success: true, hostname: "fixture.example", "error-codes": [] };

/** Intercepts the local fixture's outbound Turnstile verification requests. */
export default defineNitroPlugin(() => {
  const fetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    if (String(input) !== endpoint) return fetch(input, init);

    const token = new URLSearchParams(String(init?.body)).get("response");
    switch (token) {
      case "fixture-success":
        return Response.json({ ...verifiedResponse, action: "fixture" });
      case "fixture-success-without-action":
        return Response.json(verifiedResponse);
      case "fixture-testing-key":
        return Response.json({
          ...verifiedResponse,
          metadata: { result_with_testing_key: true }
        });
      case "fixture-rejected":
        return Response.json({ ...verifiedResponse, success: false });
      case "fixture-action-mismatch":
        return Response.json({ ...verifiedResponse, action: "other-action" });
      case "fixture-transport-failure":
        throw new Error("fixture transport failure");
      case "fixture-status-error":
        return new Response("fixture verifier rate limit", {
          status: 429,
          statusText: "fixture verifier rate limit",
          headers
        });
      case "fixture-malformed":
        return Response.json({ action: "fixture" });
      default:
        return Response.json({ ...verifiedResponse, action: "fixture" });
    }
  };
});
