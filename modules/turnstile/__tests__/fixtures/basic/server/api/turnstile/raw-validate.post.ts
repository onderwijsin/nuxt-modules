import { verifyTurnstileToken } from "../../../../../../src/runtime/server/utils/turnstile";
import { defineEventHandler, getRequestHeader } from "h3";

export default defineEventHandler(async (event) => {
  const token = getRequestHeader(event, "x-turnstile-token");
  const result = await verifyTurnstileToken(token ?? "", event);

  return { success: result.success };
});
