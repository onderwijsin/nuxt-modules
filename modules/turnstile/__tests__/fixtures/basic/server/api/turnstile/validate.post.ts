import { assertTurnstileToken } from "../../../../../../src/runtime/server/utils/turnstile";

export default defineEventHandler(async (event) => {
  await assertTurnstileToken(event, "fixture");
  return { ok: true };
});
