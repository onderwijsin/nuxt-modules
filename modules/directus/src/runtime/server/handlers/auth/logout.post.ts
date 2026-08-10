import { defineEventHandler } from "h3";

import { destroyDirectusSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await destroyDirectusSession(event);
  return null;
});
