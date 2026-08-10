import { createError, defineEventHandler } from "h3";

import { ensureFreshDirectusSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const session = await ensureFreshDirectusSession(event);
  if (!session)
    throw createError({ statusCode: 401, statusMessage: "Directus session is invalid" });
  return session.snapshot;
});
