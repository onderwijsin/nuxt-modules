import {
  isDefined,
  isFiniteNumber,
  isInteger,
  isRecord
} from "@onderwijsin/nuxt-module-utils/shared";
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
  if (!isRecord(component)) {
    throw new Error(`Healthcheck component "${name}" in ${source} must export a component object.`);
  }

  const candidate = component as Partial<HealthcheckComponentDefinition>;
  if (typeof candidate.handler !== "function") {
    throw new Error(`Healthcheck component "${name}" in ${source} must define a handler function.`);
  }

  const threshold = candidate.threshold;
  if (isDefined(threshold)) {
    if (!isRecord(threshold)) {
      throw new Error(`Healthcheck component "${name}" in ${source} has an invalid threshold.`);
    }
    const { warn, error } = threshold;
    if (
      (isDefined(warn) && (!isFiniteNumber(warn) || warn < 0)) ||
      (isDefined(error) && (!isFiniteNumber(error) || error < 0)) ||
      (isDefined(warn) && isDefined(error) && error < warn)
    ) {
      throw new Error(`Healthcheck component "${name}" in ${source} has invalid threshold values.`);
    }
  }

  const timeoutMs = candidate.timeoutMs;
  if (isDefined(timeoutMs) && (!isInteger(timeoutMs) || timeoutMs <= 0)) {
    throw new Error(`Healthcheck component "${name}" in ${source} has an invalid timeoutMs.`);
  }

  return candidate as HealthcheckComponentDefinition;
}

export type { HealthcheckComponentDefinition, HealthcheckComponentResult } from "./types/health";
