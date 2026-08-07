import type { HealthcheckComponentDefinition } from "./types/health";

/**
 * Defines a server-side healthcheck component for `server/healthcheck/**`.
 *
 * @param component - The component handler and optional response-time threshold.
 * @returns The unchanged component definition for a typed default export.
 */
export function defineHealthcheckComponent(
  component: HealthcheckComponentDefinition
): HealthcheckComponentDefinition {
  return component;
}

/**
 * Validates a discovered component after its server-only module has been imported.
 *
 * @param name - Filename-derived component name.
 * @param component - Imported default export.
 * @param source - Absolute source path used in diagnostics.
 * @returns A validated component definition.
 */
export function normalizeHealthcheckComponent(
  name: string,
  component: unknown,
  source: string
): HealthcheckComponentDefinition {
  if (!component || typeof component !== "object") {
    throw new Error(`Healthcheck component "${name}" in ${source} must export a component object.`);
  }

  const candidate = component as Partial<HealthcheckComponentDefinition>;
  if (typeof candidate.handler !== "function") {
    throw new Error(`Healthcheck component "${name}" in ${source} must define a handler function.`);
  }

  if (candidate.threshold !== undefined) {
    if (typeof candidate.threshold !== "object" || candidate.threshold === null) {
      throw new Error(`Healthcheck component "${name}" in ${source} has an invalid threshold.`);
    }
    const { warn, error } = candidate.threshold;
    if (
      (warn !== undefined && (typeof warn !== "number" || !Number.isFinite(warn) || warn < 0)) ||
      (error !== undefined &&
        (typeof error !== "number" || !Number.isFinite(error) || error < 0)) ||
      (warn !== undefined && error !== undefined && error < warn)
    ) {
      throw new Error(`Healthcheck component "${name}" in ${source} has invalid threshold values.`);
    }
  }

  if (
    candidate.timeoutMs !== undefined &&
    (!Number.isInteger(candidate.timeoutMs) || candidate.timeoutMs <= 0)
  ) {
    throw new Error(`Healthcheck component "${name}" in ${source} has an invalid timeoutMs.`);
  }

  return candidate as HealthcheckComponentDefinition;
}

export type { HealthcheckComponentDefinition, HealthcheckComponentResult } from "./types/health";
