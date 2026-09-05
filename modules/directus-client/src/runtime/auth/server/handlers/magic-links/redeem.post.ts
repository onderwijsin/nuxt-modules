import { createError, defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../../../core/same-origin";
import {
  establishDirectusSession,
  parseDirectusAuthenticationResponse
} from "../../authentication";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

const magicLinkRedeemSchema = z.object({
  magicLinkToken: z.string().min(1).max(1024),
  otp: z.string().min(1).max(6).optional()
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const body = await readValidatedBody(event, magicLinkRedeemSchema.parse);
  const config = useRuntimeConfig(event);
  const { data, error } = await attempt(async () => {
    return ofetch(joinURL(config.directusClient.baseUrl, "auth/magic-links/redeem"), {
      method: "POST",
      body: { token: body.magicLinkToken, ...(body.otp ? { otp: body.otp } : {}), mode: "json" }
    });
  });
  if (error) throw createError({ statusCode: 400, statusMessage: "Failed to redeem magic link" });
  return (await establishDirectusSession(event, parseDirectusAuthenticationResponse(data)))
    .snapshot;
});
