import { defineEventHandler, readValidatedBody } from "h3";
import { createError } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { assertDirectusTurnstile } from "../turnstile";

const passwordRequestSchema = z.object({ email: z.email().max(1024) });

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "passwordRequest");
  const body = await readValidatedBody(event, passwordRequestSchema.parse);
  const config = useRuntimeConfig(event);
  const resetUrl = config.directusClient.auth.passwordResetUrl;
  if (!resetUrl)
    throw createError({ statusCode: 500, statusMessage: "Directus passwordResetUrl is required" });
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/password/request"), {
    method: "POST",
    body: { email: body.email, reset_url: resetUrl }
  });
  return { success: true };
});
