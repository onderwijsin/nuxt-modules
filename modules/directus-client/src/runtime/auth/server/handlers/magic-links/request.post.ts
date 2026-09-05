import { defineEventHandler, readValidatedBody } from "h3";
import { createError } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../../../core/same-origin";
import { assertDirectusTurnstile } from "../../turnstile";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

const magicLinkRequestSchema = z.object({ email: z.email().max(1024) });

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "magicLinkRequest");
  const body = await readValidatedBody(event, magicLinkRequestSchema.parse);
  const config = useRuntimeConfig(event);
  const redirectUrl = config.directusClient.auth.magicLinks.redirectUrl;
  if (!redirectUrl)
    throw createError({
      statusCode: 500,
      statusMessage: "Directus magicLinks.redirectUrl is required when magic links are enabled"
    });

  const { error } = await attempt(async () => {
    return ofetch(joinURL(config.directusClient.baseUrl, "auth/magic-links/request"), {
      method: "POST",
      body: { email: body.email, redirectUrl }
    });
  });
  if (error) throw createError({ statusCode: 400, statusMessage: "Failed to request magic link" });
});
