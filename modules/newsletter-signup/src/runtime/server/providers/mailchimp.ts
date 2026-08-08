import { createHash } from "node:crypto";
import { $fetch } from "ofetch";
import { z } from "zod";
import { attemptWithRetry } from "@onderwijsin/nuxt-module-utils/shared";
import type { ModuleOptions } from "../../../types/options";
import { DEFAULT_TARGETS } from "../../shared";
import type { NewsletterSignupInput } from "../../shared";
import type { NewsletterFieldConfig } from "../../../types/options";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../../types/errors";
import { createNewsletterSignupError, getErrorStatus } from "../utils/errors";

const responseSchema = z.object({ email_address: z.email(), status: z.literal("subscribed") });

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
  const result = await attemptWithRetry(
    async () => {
      const subscriberHash = createHash("md5")
        .update(input.email.trim().toLowerCase())
        .digest("hex");
      const response = await $fetch(
        `https://${server}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${subscriberHash}`,
        {
          method: "PUT",
          timeout: 5000,
          headers: {
            Authorization: `apikey ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: {
            email_address: input.email,
            merge_fields: mergeFields,
            status: "subscribed",
            status_if_new: "subscribed",
            tags: [input.source ?? "api"]
          }
        }
      );
      const parsedResponse = responseSchema.parse(response);
      if (parsedResponse.email_address.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
        throw new Error("Mailchimp returned a different member");
      }
      return parsedResponse;
    },
    { attempts: 3, delayMs: 250 }
  );
  if (result.error !== null) {
    const error = result.error;
    const status = getErrorStatus(error);

    console.error("Subscribing to Mailchimp failed", { status });

    if (status && status >= 400 && status < 500) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput, error);
    }
    throw createNewsletterSignupError(502, NEWSLETTER_SIGNUP_ERROR_CODES.server, error);
  }
  return { success: true };
}
