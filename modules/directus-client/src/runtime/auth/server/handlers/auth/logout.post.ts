import { defineEventHandler } from "h3";

import { logoutServer } from "../../auth-server";
import { assertDirectusEventSameOrigin } from "../../csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await logoutServer(event);
  return null;
});
