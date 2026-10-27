import { defineEventHandler, readValidatedBody } from "h3";
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
  // Preserve Directus codes (including INVALID_OTP) for the shared error normalizer.
  if (error !== null) throw error;
  return (await establishDirectusSession(event, parseDirectusAuthenticationResponse(data)))
    .snapshot;
});
