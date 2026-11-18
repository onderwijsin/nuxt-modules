import { captureException, flush } from "@sentry/nuxt";
import { defineEventHandler } from "h3";
import { state } from "../../sentry.config";

export default defineEventHandler(async () => {
  state.envelopes.length = 0;
  captureException(new Error("SENTRY_CONTROLLED_ERROR"));
  await flush(2000);
  return { envelopes: state.envelopes };
});
