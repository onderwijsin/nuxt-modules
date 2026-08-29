import { defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";
import { attempt, isDefined } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";
import { DEFAULT_TARGETS, FIELD_NAMES, NON_ALLOWED_PROPERTIES } from "../../../shared";
import type { NewsletterSignupInput } from "../../../shared";
import type { NewsletterFieldConfig } from "../../../../config/options.schema";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../../../types/errors";
import { subscribeToLoops } from "../../providers/loops";
import { subscribeToMailchimp } from "../../providers/mailchimp";
import { createNewsletterSignupError, getErrorData } from "../../utils/errors";

const signupSchema = z
  .object({
    email: z.email({ error: "Ongeldig e-mailadres" }).max(512),
    firstName: z.string().trim().min(1).max(256).optional(),
    lastName: z.string().trim().min(1).max(256).optional(),
    organization: z.string().trim().min(1).max(1024).optional(),
    userId: z.string().trim().min(1).max(256).optional(),
    userGroup: z.string().trim().min(1).max(256).optional(),
    source: z.string().trim().min(1).max(256).optional(),
    listId: z.string().trim().min(1).max(256).optional()
  })
  .catchall(
    z.union([
      z.string().trim().min(1).max(1024),
      z.number().finite(),
      z.boolean(),
      z.array(z.string()),
      z.null(),
      z.undefined()
    ])
  );

const standardFieldNames = new Set<string>(FIELD_NAMES);

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

  const rateLimitResult = await attempt(() =>
    enforceRateLimit(event, { max: 5, duration: 60, ban: 900 })
  );
  if (rateLimitResult.error !== null) {
    const data = await getErrorData(rateLimitResult.error);
    if (data?.bannedUntil && typeof data.bannedUntil === "number") {
      throw createNewsletterSignupError(
        429,
        NEWSLETTER_SIGNUP_ERROR_CODES.rateLimited,
        undefined,
        data.bannedUntil
      );
    }
    throw rateLimitResult.error;
  }

  const body = await readBody<Record<string, unknown>>(event);
  const fields: Record<string, NewsletterFieldConfig> = config.fields ?? {};
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
  }

  for (const [name, field] of Object.entries(fields)) {
    const value = parsed.data[name];
    if (field.required && (!isDefined(value) || value === null || value === "")) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
    }
  }

  for (const name of Object.keys(parsed.data)) {
    if (name === "listId") continue;
    if (NON_ALLOWED_PROPERTIES.some((property) => property === name)) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
    }
    if (standardFieldNames.has(name)) continue;
    if (!fields[name]?.target) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
    }
  }

  for (const name of FIELD_NAMES) {
    if (
      name === "email" ||
      name === "source" ||
      !isDefined(parsed.data[name]) ||
      parsed.data[name] === null
    )
      continue;
    const target = fields[name]?.target ?? DEFAULT_TARGETS[config.provider][name];
    if (!target) {
      throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
    }
  }

  const listConfig = config.lists;
  if (parsed.data.listId && !listConfig?.options) {
    throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
  }
  const listId = listConfig?.options
    ? (parsed.data.listId ?? listConfig.default)
    : listConfig?.default;
  const selectedList = listConfig?.options?.find((option) => option.id === listId);
  if (!listId || (listConfig?.options && !selectedList)) {
    throw createNewsletterSignupError(400, NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput);
  }

  const normalizedInput: NewsletterSignupInput = {
    ...parsed.data,
    source: parsed.data.source ?? "api"
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
