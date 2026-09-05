import { defineEventHandler, setResponseStatus } from "h3";
import { ofetch } from "ofetch";

import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { getDirectusEndpoint } from "../authentication";
import { clearDirectusSession, getDirectusSession } from "../session";
import { attempt } from "@onderwijsin/nuxt-module-utils/shared";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const session = await getDirectusSession(event);
  const result = await attempt(async () => {
    if (session) {
      await ofetch(getDirectusEndpoint(event, "auth/logout"), {
        method: "POST",
        body: { refresh_token: session.refreshToken, mode: "json" }
      });
    }
  });
  clearDirectusSession(event);
  setResponseStatus(event, 204);
  if (result.error !== null) throw result.error;
  return null;
});
