import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";

import { createDirectusSession } from "../authentication";
import { assertDirectusEventSameOrigin } from "../../../core/same-origin";
import { assertDirectusTurnstile } from "../turnstile";

const loginSchema = z.object({
  email: z.email().max(1024),
  password: z.string().min(1).max(512),
  otp: z.string().min(1).max(6).optional()
});

export default defineEventHandler(async (event) => {
  assertDirectusEventSameOrigin(event);
  await assertDirectusTurnstile(event, "login");
  const input = await readValidatedBody(event, loginSchema.parse);
  return (await createDirectusSession(event, input)).snapshot;
});
