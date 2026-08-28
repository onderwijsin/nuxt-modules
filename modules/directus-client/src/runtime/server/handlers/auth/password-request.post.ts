import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../utils/csrf";
import {
  requestPasswordResetServer,
  requestPasswordResetServerSchema
} from "../../utils/auth-server";
import { assertDirectusTurnstile } from "../../utils/turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "passwordRequest");
  const body = await readValidatedBody(event, requestPasswordResetServerSchema.parse);
  await requestPasswordResetServer(event, body.email);
  return { success: true };
});
