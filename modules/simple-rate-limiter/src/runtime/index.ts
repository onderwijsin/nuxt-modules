import { createError, getRequestIP, getRequestURL } from "h3";
import type { H3Event } from "h3";
import { useStorage } from "nitropack/runtime";
import { z } from "zod";

const rateLimitConfigSchema = z.strictObject({
  max: z.number().int().positive(),
  duration: z.number().int().positive(),
  ban: z.number().int().nonnegative()
});

interface RateLimitEntry {
  count: number;
  resetAt: number;
  bannedUntil?: number;
}

interface RateLimitResult {
  bannedUntil?: number;
}

/**
 * Enforces a path-scoped, per-IP rate limit using Nitro storage.
 *
 * @param event - Incoming H3 request event.
 * @param config - Limit configuration; duration and ban are measured in seconds.
 * @returns A result containing the Unix-millisecond ban expiry when the client is banned.
 * @throws An H3 429 error when the client exceeds a limit without a configured ban.
 */
export async function enforceRateLimit(
  event: H3Event,
  config: z.input<typeof rateLimitConfigSchema>
): Promise<RateLimitResult> {
  const parsedConfig = rateLimitConfigSchema.parse(config);
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const path = getRequestURL(event).pathname;
  const storage = useStorage<RateLimitEntry>(`simple-rate-limiter:${encodeURIComponent(path)}`);
  const key = encodeURIComponent(ip);
  const now = Date.now();
  const current = await storage.getItem(key);

  if (current?.bannedUntil && current.bannedUntil > now) {
    return { bannedUntil: current.bannedUntil };
  }

  const entry: RateLimitEntry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + parsedConfig.duration * 1000 }
      : { count: current.count + 1, resetAt: current.resetAt };

  if (entry.count > parsedConfig.max) {
    if (parsedConfig.ban > 0) {
      entry.bannedUntil = now + parsedConfig.ban * 1000;
      await storage.setItem(key, entry);
      return { bannedUntil: entry.bannedUntil };
    }
    await storage.setItem(key, entry);
    throw createError({ statusCode: 429, statusMessage: "Too Many Requests" });
  }

  await storage.setItem(key, entry);
  return {};
}
