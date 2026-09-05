import { defineEventHandler, readValidatedBody } from "h3";
import { assertDirectusEventSameOrigin } from "../../csrf";
import { redeemMagicLinkServer, redeemMagicLinkServerSchema } from "../../actions";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const body = await readValidatedBody(event, redeemMagicLinkServerSchema.parse);
  return redeemMagicLinkServer(event, body.magicLinkToken, body.otp);
});
