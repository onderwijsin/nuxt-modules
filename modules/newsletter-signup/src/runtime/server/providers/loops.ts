import { $fetch } from "ofetch";
import { z } from "zod";
import { attempt } from "module-utils/shared";
import type { ModuleOptions } from "../../../types/options";
import { DEFAULT_TARGETS } from "../../shared";
import type { NewsletterSignupInput } from "../../shared";
import type { NewsletterFieldConfig } from "../../../types/options";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../../types/errors";
import { createNewsletterSignupError, getErrorData, getErrorStatus } from "../utils/errors";

const responseSchema = z.object({ success: z.literal(true), id: z.string() });

/**
 * Sends a validated signup to Loops using its REST API.
 * @param input - Validated normalized input fields.
 * @param listId - Loops mailing list identifier.
 * @param config - Newsletter module configuration.
 * @returns Normalized successful response.
 */
export async function subscribeToLoops(
  input: NewsletterSignupInput,
  listId: string,
  config: ModuleOptions
): Promise<{ success: true }> {
  const fields: Record<string, NewsletterFieldConfig> = config.fields ?? {};
  const targets = DEFAULT_TARGETS.loops;
  const body: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(input)) {
    const target = fields[name]?.target ?? targets[name];
    if (target) body[target] = value;
  }
  body.mailingLists = { [listId]: true };

  const result = await attempt(async () => {
    const response = await $fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body
    });
    responseSchema.parse(response);
    return response;
  });
  if (result.error !== null) {
    const error = result.error;
    const status = getErrorStatus(error);
    const providerData = getErrorData(error);

    console.error({ status, providerData });

    if (status === 409) {
      throw createNewsletterSignupError(409, NEWSLETTER_SIGNUP_ERROR_CODES.alreadyExists, error);
    }
    if (status && status >= 400 && status < 500) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput, error);
    }
    if (providerData && !status) {
      throw createNewsletterSignupError(502, NEWSLETTER_SIGNUP_ERROR_CODES.provider, error);
    }
    throw createNewsletterSignupError(502, NEWSLETTER_SIGNUP_ERROR_CODES.server, error);
  }
  return { success: true };
}
