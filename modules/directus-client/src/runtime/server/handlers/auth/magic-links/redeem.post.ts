import { defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { establishDirectusSession, parseDirectusAuthenticationResponse } from "../../../utils/auth";
import { assertDirectusEventSameOrigin } from "../../../utils/csrf";

const magicLinkRedeemSchema = z.object({
  magicLinkToken: z.string().min(1).max(1024),
  otp: z.string().min(1).max(6).optional()
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const config = useRuntimeConfig(event);
  const body = await readValidatedBody(event, magicLinkRedeemSchema.parse);
  const response = await ofetch<unknown>(
    joinURL(config.directusClient.baseUrl, "auth/magic-links/redeem"),
    {
      method: "POST",
      body: {
        token: body.magicLinkToken,
        ...(body.otp ? { otp: body.otp } : {}),
        mode: "json"
      }
    }
  );
  const session = await establishDirectusSession(
    event,
    parseDirectusAuthenticationResponse(response)
  );
  return session.snapshot;
});
