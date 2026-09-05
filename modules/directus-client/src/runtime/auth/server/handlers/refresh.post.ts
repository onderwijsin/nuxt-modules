import { defineEventHandler } from "h3";

import { refreshServer } from "../actions";
import { assertDirectusEventSameOrigin } from "../../../core/same-origin";

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  return refreshServer(event);
});
