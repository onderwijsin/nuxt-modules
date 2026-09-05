import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../csrf";
import { resetPasswordServer, resetPasswordServerSchema } from "../../auth-server";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const body = await readValidatedBody(event, resetPasswordServerSchema.parse);
  await resetPasswordServer(event, body.token, body.password);
  return { success: true };
});
