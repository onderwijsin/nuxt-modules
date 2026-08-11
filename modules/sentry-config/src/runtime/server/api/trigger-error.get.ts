import { defineEventHandler } from "h3";
import { enforceRateLimit } from "@onderwijsin/nuxt-simple-rate-limiter/runtime";

const TEST_ROUTE_LIMIT = { max: 5, duration: 60, ban: 0 };

/**
 * Throws a controlled error to verify Sentry server-side capture and tracing.
 *
 * @param event - Incoming Nitro request event.
 * @throws {Error} Always throws a test error after applying a per-IP limit.
 */
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, TEST_ROUTE_LIMIT);
  throw new Error("Sentry test API route error");
});
