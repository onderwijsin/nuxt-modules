export { ERROR_CODES, NEWSLETTER_SIGNUP_ERROR_CODES } from "./types/errors";
export type { NewsletterSignupErrorCode, NewsletterSignupErrorData } from "./types/errors";
export type { NewsletterSignupPayload } from "./app/composables/newsletterSignup";
export { useNewsletterSignup } from "./app/composables/newsletterSignup";
export { createNewsletterSignupError, getErrorData, getErrorStatus } from "./server/utils/errors";
