import { createError, defineEventHandler } from "h3";

import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { ensureFreshDirectusSession } from "../refresh";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const session = await ensureFreshDirectusSession(event);
  if (!session)
    throw createError({ statusCode: 401, statusMessage: "Directus session is invalid" });
  return session.snapshot;
});
