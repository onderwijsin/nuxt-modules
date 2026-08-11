/**
 * Throws an intentional error to validate Sentry server-side capture and tracing.
 *
 * @returns Never returns.
 * @throws {Error} Always throws a test error.
 */
export default defineEventHandler(() => {
  throw new Error(`Sentry test API route error at ${Date.now()}`);
});
