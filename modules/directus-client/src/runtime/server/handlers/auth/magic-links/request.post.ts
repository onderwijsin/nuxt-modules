import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../../utils/csrf";
import { requestMagicLinkServer, requestMagicLinkServerSchema } from "../../../utils/auth-server";
import { assertDirectusTurnstile } from "../../../utils/turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "magicLinkRequest");
  const body = await readValidatedBody(event, requestMagicLinkServerSchema.parse);
  await requestMagicLinkServer(event, body.email);
});
