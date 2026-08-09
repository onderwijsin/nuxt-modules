import { createError, getRequestIP, getRequestURL } from "h3";
import type { H3Event } from "h3";
import { useRuntimeConfig, useStorage } from "nitropack/runtime";
import { z } from "zod";

import {
  DEFAULT_STALE_AFTER_SECONDS,
  GLOBAL_STORAGE_NAMESPACE,
  type GlobalRateLimitEntry
} from "./server/utils/global";

const rateLimitConfigSchema = z.strictObject({
  max: z.number().int().positive(),
  duration: z.number().int().positive(),
  ban: z.number().int().nonnegative(),
  trustXForwardedFor: z.boolean().optional()
});

interface RateLimitEntry {
  count: number;
  resetAt: number;
  bannedUntil?: number;
}

type RateLimitConfig = z.input<typeof rateLimitConfigSchema>;

const globallyEnforcedEvents = new WeakSet<object>();
let globalDisabledWarningLogged = false;
const globalDurationWarnings = new Set<number>();

/**
 * Enforces a path-scoped, per-IP rate limit using Nitro storage.
 *
 * @param event - Incoming H3 request event.
 * @param config - Limit configuration; duration and ban are measured in seconds.
 * @throws An H3 429 error containing `data.bannedUntil` and `data.limits` when the client exceeds the limit.
 */
export async function enforceRateLimit(event: H3Event, config: RateLimitConfig): Promise<void> {
  const { parsedConfig, ip, key, now } = getRateLimitContext(event, config);
  const path = getRequestURL(event).pathname;
  const storage = useStorage<RateLimitEntry>(`simple-rate-limiter:${encodeURIComponent(path)}`);
  const current = await storage.getItem(key);

  throwIfBanned(current, parsedConfig, now);

  const entry: RateLimitEntry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + parsedConfig.duration * 1000 }
      : { count: current.count + 1, resetAt: current.resetAt };

  if (isGlobalRateLimitingEnabled()) {
    warnIfGlobalDurationExceedsRetention(parsedConfig.duration);
    await recordGlobalRequest(event, ip, now);
  }
  if (entry.count > parsedConfig.max) {
    entry.bannedUntil =
      now + (parsedConfig.ban > 0 ? parsedConfig.ban * 1000 : entry.resetAt - now);
    await storage.setItem(key, entry);
    throwRateLimitError(entry.bannedUntil, parsedConfig);
  }
  await storage.setItem(key, entry);
}

/**
 * Enforces a per-IP rate limit shared by all request paths.
 *
 * Call this from middleware before any path-scoped limiter. Path-scoped requests are recorded in
 * the global counter as well, without being counted twice when both checks run for one request.
 *
 * @param event - Incoming H3 request event.
 * @param config - Limit configuration; duration and ban are measured in seconds.
 * @throws An H3 429 error containing `data.bannedUntil` and `data.limits` when the client exceeds the limit.
 */
export async function enforceGlobalRateLimit(
  event: H3Event,
  config: RateLimitConfig
): Promise<void> {
  if (!isGlobalRateLimitingEnabled()) {
    logGlobalRateLimitingDisabled();
    return;
  }

  if (globallyEnforcedEvents.has(event)) return;

  const { parsedConfig, key, now } = getRateLimitContext(event, config);
  warnIfGlobalDurationExceedsRetention(parsedConfig.duration);
  const storage = useStorage<GlobalRateLimitEntry>(GLOBAL_STORAGE_NAMESPACE);
  const current = await storage.getItem(key);
  const timestamps = (current?.timestamps ?? []).filter(
    (timestamp) => timestamp > now - parsedConfig.duration * 1000
  );

  throwIfBanned(current, parsedConfig, now);
  if (current && timestamps.length >= parsedConfig.max) {
    const bannedUntil =
      parsedConfig.ban > 0
        ? now + parsedConfig.ban * 1000
        : (timestamps[0] ?? now) + parsedConfig.duration * 1000;
    await storage.setItem(key, { timestamps, bannedUntil });
    throwRateLimitError(bannedUntil, parsedConfig);
  }

  timestamps.push(now);
  await storage.setItem(key, { timestamps });
  globallyEnforcedEvents.add(event);
}

async function recordGlobalRequest(event: H3Event, ip: string, now: number): Promise<void> {
  if (globallyEnforcedEvents.has(event)) return;

  const storage = useStorage<GlobalRateLimitEntry>(GLOBAL_STORAGE_NAMESPACE);
  const key = encodeURIComponent(ip);
  const current = await storage.getItem(key);
  await storage.setItem(key, { timestamps: [...(current?.timestamps ?? []), now] });
}

function isGlobalRateLimitingEnabled(): boolean {
  return useRuntimeConfig().simpleRateLimiter?.global?.enabled === true;
}

function logGlobalRateLimitingDisabled(): void {
  if (globalDisabledWarningLogged) return;

  globalDisabledWarningLogged = true;
  console.error(
    "[simple-rate-limiter] Global enforcement is disabled; the request was not globally rate limited. Enable simpleRateLimiter.global.enabled to use enforceGlobalRateLimit()."
  );
}

function warnIfGlobalDurationExceedsRetention(duration: number): void {
  const pruning = useRuntimeConfig().simpleRateLimiter?.global?.pruning;
  if (pruning?.enabled !== true) return;

  const staleAfter = pruning.staleAfter ?? DEFAULT_STALE_AFTER_SECONDS;
  if (duration <= staleAfter || globalDurationWarnings.has(duration)) return;

  globalDurationWarnings.add(duration);
  console.error(
    `[simple-rate-limiter] Global rate-limit duration (${duration}s) exceeds pruning staleAfter (${staleAfter}s). Increase staleAfter to prevent pruning records that may still affect rate-limit decisions.`
  );
}

function getRateLimitContext(event: H3Event, config: RateLimitConfig) {
  const parsedConfig = rateLimitConfigSchema.parse(config);
  const ip =
    (config.trustXForwardedFor === true
      ? getRequestIP(event, { xForwardedFor: true })
      : getRequestIP(event)) ?? "unknown";

  return {
    parsedConfig,
    ip,
    key: encodeURIComponent(ip),
    now: Date.now()
  };
}

function throwIfBanned(
  current: Pick<RateLimitEntry, "bannedUntil"> | null | undefined,
  config: RateLimitConfig,
  now: number
): void {
  if (current?.bannedUntil && current.bannedUntil > now) {
    throwRateLimitError(current.bannedUntil, config);
  }
}

function throwRateLimitError(bannedUntil: number, limits: RateLimitConfig): never {
  throw createError({
    statusCode: 429,
    statusMessage: "Too Many Requests",
    data: { bannedUntil, limits }
  });
}
