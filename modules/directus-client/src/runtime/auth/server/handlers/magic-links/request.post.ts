import { defineEventHandler, readValidatedBody } from "h3";

import { assertDirectusEventSameOrigin } from "../../csrf";
import { requestMagicLinkServer, requestMagicLinkServerSchema } from "../../actions";
import { assertDirectusTurnstile } from "../../turnstile";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "magicLinkRequest");
  const body = await readValidatedBody(event, requestMagicLinkServerSchema.parse);
  await requestMagicLinkServer(event, body.email);
});
