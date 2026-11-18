import { getClient } from "@sentry/nuxt";
import { defineEventHandler } from "h3";
import { state } from "../../sentry.config";

export default defineEventHandler(() => {
  const options = getClient()?.getOptions();
  return {
    initializations: state.initializations,
    release: options?.release,
    sendDefaultPii: options && "sendDefaultPii" in options ? options.sendDefaultPii : undefined,
    enableLogs: options && "enableLogs" in options ? options.enableLogs : undefined,
    dataCollection: options?.dataCollection
  };
});
