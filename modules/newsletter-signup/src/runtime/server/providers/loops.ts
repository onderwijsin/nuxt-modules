import { $fetch } from "ofetch";
import { z } from "zod";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";
import type { ModuleOptions, NewsletterFieldConfig } from "../../../config/options.schema";
import { DEFAULT_TARGETS, NON_ALLOWED_PROPERTIES } from "../../shared";
import type { NewsletterSignupInput } from "../../shared";
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
    if (NON_ALLOWED_PROPERTIES.some((property) => property === name)) continue;
    const target = fields[name]?.target ?? targets[name];
    if (target) body[target] = value;
  }
  body.mailingLists = { [listId]: true };

  const result = await attempt(async () => {
    const response = await $fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      timeout: 5000,
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body
    });
    responseSchema.parse(response);
    return response;
  });
  if (result.error !== null) {
    const error = result.error;
    const status = getErrorStatus(error);
    const providerData = await getErrorData(error);

    console.error("Subscribing to Loops failed", { status });

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
