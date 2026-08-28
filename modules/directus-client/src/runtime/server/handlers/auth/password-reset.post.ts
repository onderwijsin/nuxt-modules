import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../utils/csrf";
import { resetPasswordServer, resetPasswordServerSchema } from "../../utils/auth-server";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const body = await readValidatedBody(event, resetPasswordServerSchema.parse);
  await resetPasswordServer(event, body.token, body.password);
  return { success: true };
});
