import { defineEventHandler } from "h3";

import { logoutServer } from "../../utils/auth-server";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await logoutServer(event);
  return null;
});
