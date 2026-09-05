import { defineEventHandler, readValidatedBody } from "h3";
import { loginServer, loginServerSchema } from "../actions";
import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { assertDirectusTurnstile } from "../turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "login");
  const input = await readValidatedBody(event, loginServerSchema.parse);
  return loginServer(event, input);
});
