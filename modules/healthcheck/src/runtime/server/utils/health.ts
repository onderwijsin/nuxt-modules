import type { H3Event } from "h3";
import { useRuntimeConfig } from "#imports";
import { useStorage } from "nitropack/runtime";
import { ofetch } from "ofetch";
import { attempt, fromEntries } from "module-utils/shared";

import type {
  HealthCheckResult,
  HealthCheckThreshold,
  HealthStatus,
  HealthcheckComponentDefinition,
  SystemHealthResponse
} from "../../../types/health";

const CACHE_HEALTH_KEY_PREFIX = "healthcheck:system";

/**
 * Converts unknown handler failures into safe, useful response messages.
 *
 * @param error - Thrown value from a component handler.
 * @returns A safe error message for the health response.
 */
function getErrorMessage(error: unknown): string {
  console.error("Healthcheck component failed", error);
  return "Health check failed";
}

/**
 * Maps a measured response time to the configured health status.
 *
 * @param responseTimeMs - Measured component response time in milliseconds.
 * @param threshold - Optional warning and error boundaries.
 * @returns The status implied by the response-time thresholds.
 */
function resolveThresholdStatus(
  responseTimeMs: number,
  threshold?: HealthCheckThreshold
): Exclude<HealthStatus, "error"> | "error" {
  if (threshold?.error !== undefined && responseTimeMs >= threshold.error) return "error";
  if (threshold?.warn !== undefined && responseTimeMs >= threshold.warn) return "warn";
  return "ok";
}

/**
 * Executes one component, measures it, and normalizes success and failure results.
 *
 * @param component - Component definition to execute.
 * @param event - Nitro request event passed to the component handler.
 * @param threshold - Module-level threshold overriding the component default.
 * @param timeoutMs - Maximum time allotted to the component handler.
 * @returns A normalized component result with status and response time.
 */
async function runComponent(
  component: HealthcheckComponentDefinition,
  event: H3Event,
  threshold: HealthCheckThreshold | undefined,
  timeoutMs: number
): Promise<HealthCheckResult> {
  const startedAt = performance.now();
  const operationResult = await attempt(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const handlerResult = await Promise.race([
        component.handler({ event, signal: controller.signal }),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(new Error("Health check timed out")),
            { once: true }
          );
        })
      ]);
      const normalizedResult = handlerResult ?? {};
      const responseTimeMs = Math.round(performance.now() - startedAt);
      const status =
        normalizedResult.status ??
        resolveThresholdStatus(responseTimeMs, threshold ?? component.threshold);
      return { ...normalizedResult, status, responseTimeMs };
    } finally {
      clearTimeout(timeout);
    }
  });
  if (operationResult.error !== null || !operationResult.data) {
    return {
      status: "error",
      responseTimeMs: Math.round(performance.now() - startedAt),
      error: getErrorMessage(operationResult.error ?? new Error("Unknown error"))
    };
  }
  return operationResult.data;
}

/** Performs a write/read/delete probe against Nitro's named cache storage. */
async function checkCache(): Promise<void> {
  const storage = useStorage("cache");
  const value = { health: Date.now() };
  const key = `${CACHE_HEALTH_KEY_PREFIX}:${value.health}`;
  const result = await attempt(async () => {
    await storage.setItem(key, value);
    const stored = await storage.getItem<{ health?: number } | null>(key);
    if (!stored || stored.health !== value.health) {
      throw new Error("Cache storage returned an unexpected value");
    }
  });
  await storage.removeItem(key);
  if (result.error !== null) throw result.error;
}

/**
 * Performs Cloudinary's authenticated account ping.
 *
 * @param event - Nitro request event used to read private runtime configuration.
 */
async function checkCloudinary(event: H3Event): Promise<void> {
  const config = useRuntimeConfig(event).healthcheck.cloudinary;
  const cloudName = config?.cloudName?.trim();
  const apiKey = config?.apiKey?.trim();
  const apiSecret = config?.apiSecret?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary cloudName, apiKey, and apiSecret are required");
  }
  const authorization = btoa(`${apiKey}:${apiSecret}`);
  await ofetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
    retry: 0,
    timeout: 5000,
    headers: { authorization: `Basic ${authorization}` }
  });
}

/**
 * Performs Directus's server ping endpoint check.
 *
 * @param event - Nitro request event used to read private runtime configuration.
 */
async function checkDirectus(event: H3Event): Promise<void> {
  const baseUrl = useRuntimeConfig(event).healthcheck.directus?.baseUrl?.trim();
  if (!baseUrl) throw new Error("Directus baseUrl is required");
  await ofetch(new URL("/server/ping", baseUrl).toString(), {
    retry: 0,
    timeout: 5000
  });
}

function resolveOverallStatus(checks: HealthCheckResult[]): HealthStatus {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "ok";
}

/**
 * Runs all enabled built-in and consumer-defined healthcheck components.
 *
 * @param event - Nitro request event used by component handlers to access runtime configuration.
 * @param customComponents - Consumer-defined components registered by the generated route handler.
 * @returns Aggregated health status and per-component results.
 */
export async function getSystemHealth(
  event: H3Event,
  customComponents: Map<string, HealthcheckComponentDefinition> = new Map()
): Promise<SystemHealthResponse> {
  const config = useRuntimeConfig(event).healthcheck;
  const definitions = new Map<string, HealthcheckComponentDefinition>();
  if (config.cache?.enabled)
    definitions.set("cache", { handler: checkCache, timeoutMs: config.cache.timeoutMs });
  if (config.cloudinary?.enabled)
    definitions.set("cloudinary", {
      handler: ({ event }) => checkCloudinary(event),
      timeoutMs: config.cloudinary.timeoutMs
    });
  if (config.directus?.enabled)
    definitions.set("directus", {
      handler: ({ event }) => checkDirectus(event),
      timeoutMs: config.directus.timeoutMs
    });
  for (const [name, component] of customComponents) {
    definitions.set(name, component);
  }

  // Checks are independent, so run them concurrently and preserve their names.
  const entries = await Promise.all(
    [...definitions.entries()].map(async ([name, component]) => {
      const threshold =
        name === "cache"
          ? config.cache?.threshold
          : name === "cloudinary"
            ? config.cloudinary?.threshold
            : name === "directus"
              ? config.directus?.threshold
              : undefined;
      return [
        name,
        await runComponent(component, event, threshold, component.timeoutMs ?? config.timeoutMs)
      ] as const;
    })
  );
  const components = fromEntries(entries);
  return {
    status: resolveOverallStatus(Object.values(components)),
    timestamp: new Date().toISOString(),
    components
  };
}
