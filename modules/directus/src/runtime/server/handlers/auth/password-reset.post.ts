import { defineEventHandler, readValidatedBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { ofetch } from "ofetch";
import { joinURL } from "ufo";
import { z } from "zod";

const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1)
});

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, passwordResetSchema.parse);
  const config = useRuntimeConfig(event);
  await ofetch(joinURL(config.directus.baseUrl, "auth/password/reset"), {
    method: "POST",
    body
  });
  return { success: true };
});
