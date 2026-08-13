import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";

import { createDirectusSession } from "../../utils/auth";
import { assertDirectusEventSameOrigin } from "../../utils/csrf";
import { assertDirectusTurnstile } from "../../utils/turnstile";

const loginSchema = z.object({
  email: z.email().max(1024),
  password: z.string().min(1).max(512),
  otp: z.string().min(1).max(6).optional()
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "login");
  const input = await readValidatedBody(event, loginSchema.parse);
  const session = await createDirectusSession(event, input);
  return session.snapshot;
});
