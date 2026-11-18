import { captureException, flush, getClient } from "@sentry/nuxt";
import { state } from "../../../../../sentry.config";

export default defineEventHandler(async (event) => {
  if (getQuery(event).inspect !== "true") {
    state.events.length = 0;
    captureException(new Error("SENTRY_PACKED_ERROR"));
  }
  await flush(2000);
  const options = getClient()?.getOptions();
  return {
    layer: "sentry-config",
    initializations: state.initializations,
    sendDefaultPii: options && "sendDefaultPii" in options ? options.sendDefaultPii : undefined,
    enableLogs: options && "enableLogs" in options ? options.enableLogs : undefined,
    dataCollection: options?.dataCollection,
    events: state.events
  };
});
