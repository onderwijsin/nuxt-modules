import { defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

import { assertDirectusEventSameOrigin } from "../../utils/csrf";

const passwordResetSchema = z.object({
  token: z.string().min(1).max(1024),
  password: z.string().min(1).max(512)
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const body = await readValidatedBody(event, passwordResetSchema.parse);
  const config = useRuntimeConfig(event);
  await ofetch(joinURL(config.directusClient.baseUrl, "auth/password/reset"), {
    method: "POST",
    body
  });
  return { success: true };
});
