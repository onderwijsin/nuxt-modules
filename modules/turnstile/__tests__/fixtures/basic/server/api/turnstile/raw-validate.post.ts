import { defineEventHandler, getRequestHeader } from "h3";
import { verifyTurnstileToken } from "../../../../../../src/runtime/server/utils/verify";

export default defineEventHandler(async (event) => {
  const token = getRequestHeader(event, "x-turnstile-token");
  const result = await verifyTurnstileToken(token ?? "", event);

  return { success: result.success };
});
