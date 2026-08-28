import { defineEventHandler, readValidatedBody } from "h3";
import { loginServer, loginServerSchema } from "../../utils/auth-server";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";
import { assertDirectusTurnstile } from "../../utils/turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "login");
  const input = await readValidatedBody(event, loginServerSchema.parse);
  return loginServer(event, input);
});
