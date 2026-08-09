import { defineEventHandler, getRequestURL } from "h3";

const RATE_LIMIT = { max: 5, duration: 1, ban: 0 };

export default defineEventHandler(async (event) => {
  if (!getRequestURL(event).pathname.startsWith("/api/")) return;

  await enforceGlobalRateLimit(event, RATE_LIMIT);
});
