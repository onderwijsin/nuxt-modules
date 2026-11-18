import { getClient } from "@sentry/nuxt";
import { defineEventHandler } from "h3";
import { state } from "../../sentry.config";

export default defineEventHandler(() => ({
  initializations: state.initializations,
  release: getClient()?.getOptions().release,
  sendDefaultPii: getClient()?.getOptions().sendDefaultPii,
  enableLogs: getClient()?.getOptions().enableLogs
}));
