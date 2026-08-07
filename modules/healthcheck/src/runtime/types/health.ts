export type HealthStatus = "ok" | "warn" | "error";

export interface HealthCheckThreshold {
  warn?: number;
  error?: number;
}

export interface HealthcheckComponentResult {
  status?: HealthStatus;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheckResult extends HealthcheckComponentResult {
  status: HealthStatus;
  responseTimeMs: number;
}

export interface HealthcheckComponentContext {
  event: import("h3").H3Event;
  signal: AbortSignal;
}

export interface HealthcheckComponentDefinition {
  handler: (context: HealthcheckComponentContext) => Promise<HealthcheckComponentResult | void>;
  threshold?: HealthCheckThreshold;
  timeoutMs?: number;
}

export interface SystemHealthResponse {
  status: HealthStatus;
  timestamp: string;
  components: Record<string, HealthCheckResult>;
}
