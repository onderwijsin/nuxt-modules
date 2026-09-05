import { defineEventHandler } from "h3";

import { refreshServer } from "../../auth-server";
import { assertDirectusEventSameOrigin } from "../../csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  return refreshServer(event);
});
