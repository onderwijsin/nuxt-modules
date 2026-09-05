import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { requestPasswordResetServer, requestPasswordResetServerSchema } from "../actions";
import { assertDirectusTurnstile } from "../turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "passwordRequest");
  const body = await readValidatedBody(event, requestPasswordResetServerSchema.parse);
  await requestPasswordResetServer(event, body.email);
  return { success: true };
});
