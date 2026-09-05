import { defineEventHandler } from "h3";

import { logoutServer } from "../actions";
import { assertDirectusEventSameOrigin } from "../csrf";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await logoutServer(event);
  return null;
});
