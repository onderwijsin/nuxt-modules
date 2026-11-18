import { captureException, flush, getClient } from "@sentry/nuxt";
import { state } from "../../../../../sentry.config";

export default defineEventHandler(async () => {
  state.events.length = 0;
  captureException(new Error("SENTRY_PACKED_ERROR"));
  await flush(2000);
  return {
    layer: "sentry-config",
    initializations: state.initializations,
    sendDefaultPii: getClient()?.getOptions().sendDefaultPii,
    enableLogs: getClient()?.getOptions().enableLogs,
    events: state.events
  };
});
