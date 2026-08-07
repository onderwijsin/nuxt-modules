import { $fetch } from "ofetch";
import { z } from "zod";
import { attempt } from "module-utils/shared";
import type { ModuleOptions } from "../../../types/options";
import { DEFAULT_TARGETS } from "../../shared";
import type { NewsletterSignupInput } from "../../shared";
import type { NewsletterFieldConfig } from "../../../types/options";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../../types/errors";
import { createNewsletterSignupError, getErrorData, getErrorStatus } from "../utils/errors";

const responseSchema = z.object({ email_address: z.string(), status: z.string() });

/**
 * Sends a validated signup to Mailchimp using its REST API.
 * @param input - Validated normalized input fields.
 * @param listId - Mailchimp audience identifier.
 * @param server - Mailchimp server value for the selected audience.
 * @param config - Newsletter module configuration.
 * @returns Normalized successful response.
 */
export async function subscribeToMailchimp(
  input: NewsletterSignupInput,
  listId: string,
  server: string,
  config: ModuleOptions
): Promise<{ success: true }> {
  const fields: Record<string, NewsletterFieldConfig> = config.fields ?? {};
  const mergeFields: Record<string, string> = {};
  for (const [name, value] of Object.entries(input)) {
    if (name === "email" || name === "source") continue;
    const target = fields[name]?.target ?? DEFAULT_TARGETS.mailchimp[name];
    if (target) mergeFields[target] = value;
  }
  const result = await attempt(async () => {
    const response = await $fetch(
      `https://${server}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members`,
      {
        method: "POST",
        headers: {
          Authorization: `apikey ${config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: {
          email_address: input.email,
          merge_fields: mergeFields,
          status: "subscribed",
          tags: [input.source ?? "api"]
        }
      }
    );
    responseSchema.parse(response);
    return response;
  });
  if (result.error !== null) {
    const error = result.error;
    const status = getErrorStatus(error);
    const data = getErrorData(error);

    console.error({ status, data });

    if (data?.title === "Member Exists" || data?.detail === "Member Exists") {
      throw createNewsletterSignupError(429, NEWSLETTER_SIGNUP_ERROR_CODES.alreadyExists, error);
    }
    if (status && status >= 400 && status < 500) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput, error);
    }
    throw createNewsletterSignupError(502, NEWSLETTER_SIGNUP_ERROR_CODES.server, error);
  }
  return { success: true };
}
