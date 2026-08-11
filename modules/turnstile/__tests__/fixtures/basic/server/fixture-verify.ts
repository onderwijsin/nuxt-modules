import { createError } from "h3";

export async function verifyTurnstileToken(token: string) {
  switch (token) {
    case "fixture-success":
      return { success: true, action: "fixture" };
    case "fixture-success-without-action":
      return { success: true };
    case "fixture-testing-key":
      return { success: true, metadata: { result_with_testing_key: true } };
    case "fixture-rejected":
      return { success: false };
    case "fixture-action-mismatch":
      return { success: true, action: "other-action" };
    case "fixture-transport-failure":
      throw new Error("fixture transport failure");
    case "fixture-status-error":
      throw createError({ statusCode: 429, statusMessage: "fixture verifier rate limit" });
    case "fixture-malformed":
      return { action: "fixture" };
    default:
      return { success: true, action: "fixture" };
  }
}
