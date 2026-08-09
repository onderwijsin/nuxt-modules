import { defineEventHandler } from "h3";

const RATE_LIMIT = { max: 5, duration: 1, ban: 0 };

export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, RATE_LIMIT);

  return {
    ok: true,
    message: "The route-scoped request was allowed."
  };
});
