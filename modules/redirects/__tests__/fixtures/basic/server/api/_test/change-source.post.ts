import { defineEventHandler } from "h3";

/**
 * Changes the fixture source response used by the next refresh.
 *
 * @returns The changed destination.
 */
export default defineEventHandler(() => {
  process.env.REDIRECTS_TEST_REFRESH_DESTINATION = "/refresh-second";
  return { data: { to: process.env.REDIRECTS_TEST_REFRESH_DESTINATION } };
});
