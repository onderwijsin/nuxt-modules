import { createError, defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../../utils/csrf";
import { assertDirectusTurnstile } from "../../../utils/turnstile";

const magicLinkRequestSchema = z.object({ email: z.email().max(1024) });

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "magicLinkRequest");
  const config = useRuntimeConfig(event);
  const body = await readValidatedBody(event, magicLinkRequestSchema.parse);
  const redirectUrl = config.directusClient.auth.magicLinks.redirectUrl;
  if (!redirectUrl)
    throw createError({
      statusCode: 500,
      statusMessage: "Directus magicLinks.redirectUrl is required when magic links are enabled"
    });
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/magic-links/request"), {
    method: "POST",
    body: { email: body.email, redirectUrl }
  });
});
