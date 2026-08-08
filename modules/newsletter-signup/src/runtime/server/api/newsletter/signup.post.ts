import { defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";
import { z } from "zod";
import { FIELD_NAMES } from "../../../shared";
import type { NewsletterSignupInput } from "../../../shared";
import type { NewsletterFieldConfig } from "../../../../types/options";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../../../types/errors";
import { subscribeToLoops } from "../../providers/loops";
import { subscribeToMailchimp } from "../../providers/mailchimp";
import { createNewsletterSignupError, getErrorData } from "../../utils/errors";

const signupSchema = z
  .object({
    email: z.email({ error: "Ongeldig e-mailadres" }),
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    organization: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    listId: z.string().trim().min(1).optional()
  })
  .strict();

/**
 * Handles provider-independent newsletter signup requests.
 * @param event - Incoming H3 request event.
 * @returns Provider response after a successful signup.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event).newsletterSignup;
  if (!config?.apiKey || !config?.provider) {
    throw createNewsletterSignupError(500, NEWSLETTER_SIGNUP_ERROR_CODES.configuration);
  }

  try {
    await enforceRateLimit(event, { max: 5, duration: 60, ban: 900 });
  } catch (error) {
    const data = getErrorData(error);
    if (data?.bannedUntil && typeof data.bannedUntil === "number") {
      throw createNewsletterSignupError(
        429,
        NEWSLETTER_SIGNUP_ERROR_CODES.rateLimited,
        undefined,
        data.bannedUntil
      );
    }
    throw error;
  }

  const body = await readBody<Record<string, unknown>>(event);
  const fields: Record<string, NewsletterFieldConfig> = config.fields ?? {};
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
  }

  for (const name of FIELD_NAMES.slice(1)) {
    if (fields[name]?.required && !parsed.data[name]) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
    }
  }

  const listConfig = config.lists;
  const listId = parsed.data.listId ?? listConfig?.default;
  const selectedList = listConfig?.options?.find((option) => option.id === listId);
  if (!listId || (listConfig?.options && !selectedList)) {
    throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
  }

  const normalizedInput: NewsletterSignupInput = {
    email: parsed.data.email,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    organization: parsed.data.organization,
    source: parsed.data.source ?? "api",
    listId: parsed.data.listId
  };
  if (config.provider === "loops") {
    return subscribeToLoops(normalizedInput, listId, config);
  }
  const mailchimpServer = selectedList?.server ?? config.server;
  if (!mailchimpServer) {
    throw createNewsletterSignupError(500, NEWSLETTER_SIGNUP_ERROR_CODES.configuration);
  }
  return subscribeToMailchimp(normalizedInput, listId, mailchimpServer, config);
});
