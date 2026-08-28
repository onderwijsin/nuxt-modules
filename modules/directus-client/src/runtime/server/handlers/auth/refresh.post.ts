import { defineEventHandler } from "h3";

import { refreshServer } from "../../utils/auth-server";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  return refreshServer(event);
});
