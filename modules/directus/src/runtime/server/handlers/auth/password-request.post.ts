import { createError, defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../utils/csrf";

const passwordRequestSchema = z.object({ email: z.email() });

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const config = useRuntimeConfig(event);
  const body = await readValidatedBody(event, passwordRequestSchema.parse);
  const resetUrl = config.directus.auth.passwordResetUrl;
  if (!resetUrl)
    throw createError({ statusCode: 500, statusMessage: "Directus passwordResetUrl is required" });
  await ofetch(joinURL(config.directus.baseUrl, "auth/password/request"), {
    method: "POST",
    body: { ...body, reset_url: resetUrl }
  });
  return { success: true };
});
