import { defineEventHandler } from "h3";

import { destroyDirectusSession } from "../../utils/auth";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await destroyDirectusSession(event);
  return null;
});
