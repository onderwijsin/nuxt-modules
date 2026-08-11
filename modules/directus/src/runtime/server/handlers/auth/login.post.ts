import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";

import { createDirectusSession } from "../../utils/auth";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
  otp: z.string().min(1).optional()
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  const input = await readValidatedBody(event, loginSchema.parse);
  const session = await createDirectusSession(event, input);
  return session.snapshot;
});
