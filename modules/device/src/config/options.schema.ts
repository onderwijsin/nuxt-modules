import { enabled } from "@onderwijsin/nuxt-module-utils/shared";
import { z } from "zod";

export const DEFAULT_DEVICE_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.39 Safari/537.36";

/** Runtime validation schema for the public device module options. */
export const deviceOptionsSchema = z.object({
  enabled,
  defaultUserAgent: z.string().min(1).default(DEFAULT_DEVICE_USER_AGENT)
});

export type DeviceOptionsSchema = typeof deviceOptionsSchema;
