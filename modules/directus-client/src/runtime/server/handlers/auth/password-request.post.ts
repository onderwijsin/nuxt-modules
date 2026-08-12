import { createError, defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../utils/csrf";
import { assertDirectusTurnstile } from "../../utils/turnstile";

const passwordRequestSchema = z.object({ email: z.email() });

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "passwordRequest");
  const config = useRuntimeConfig(event);
  const body = await readValidatedBody(event, passwordRequestSchema.parse);
  const resetUrl = config.directusClient.auth.passwordResetUrl;
  if (!resetUrl)
    throw createError({ statusCode: 500, statusMessage: "Directus passwordResetUrl is required" });
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/password/request"), {
    method: "POST",
    body: { ...body, reset_url: resetUrl }
  });
  return { success: true };
});
