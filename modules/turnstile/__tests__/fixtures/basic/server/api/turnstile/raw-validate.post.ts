import { getRequestHeader } from "h3";
import { TURNSTILE_TOKEN_HEADER } from "@onderwijsin/nuxt-turnstile/runtime";

export default defineEventHandler(async (event) => {
  const token = getRequestHeader(event, TURNSTILE_TOKEN_HEADER);
  const result = await verifyTokenWithTurnstile(token ?? "", event);

  return { success: result.success };
});
