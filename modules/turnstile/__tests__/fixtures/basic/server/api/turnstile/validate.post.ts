import { assertTurnstileToken } from "../../../../../../src/runtime/server/utils/turnstile";
import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  await assertTurnstileToken(event, "fixture");
  return { ok: true };
});
