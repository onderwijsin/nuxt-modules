import { shallowRef } from "vue";

interface RateLimitResponse {
  ok: true;
  message: string;
}

interface RequestResult {
  status: "allowed" | "limited";
}

interface ErrorRecord {
  data?: unknown;
  statusCode?: unknown;
}

const LIMIT = 5;
const WINDOW_SECONDS = 1;

function isErrorRecord(error: unknown): error is ErrorRecord {
  return typeof error === "object" && error !== null;
}

function getStatusCode(error: unknown): number | undefined {
  if (!isErrorRecord(error)) return undefined;

  if (typeof error.statusCode === "number") return error.statusCode;

  if (!isErrorRecord(error.data)) return undefined;
  return typeof error.data.statusCode === "number" ? error.data.statusCode : undefined;
}

function getFriendlyErrorMessage(error: unknown): string {
  if (getStatusCode(error) === 429) {
    return `The demo allows ${LIMIT} requests per second. Wait a moment and try again.`;
  }

  return "The request could not be completed. Check the playground server and try again.";
}

/**
 * Provides request scenarios, result state, and toast feedback for the playground demo.
 *
 * @returns The demo state and request action.
 */
export function useRateLimitDemo() {
  const pending = shallowRef<number | null>(null);
  const lastRun = shallowRef<RequestResult[]>([]);
  const toast = useToast();

  async function runRequests(requestCount: number): Promise<void> {
    pending.value = requestCount;
    lastRun.value = [];

    const responses = await Promise.allSettled(
      Array.from({ length: requestCount }, () => $fetch<RateLimitResponse>("/api/rate-limit"))
    );

    const results = responses.map(
      (response) =>
        ({
          status: response.status === "fulfilled" ? "allowed" : "limited"
        }) satisfies RequestResult
    );
    const allowed = results.filter((result) => result.status === "allowed").length;
    const limited = results.length - allowed;

    lastRun.value = results;
    pending.value = null;

    if (limited === 0) {
      toast.add({
        title: `${allowed} request${allowed === 1 ? "" : "s"} allowed`,
        description: "The request completed within both the global and route limits.",
        color: "success",
        icon: "i-lucide-check-circle"
      });
      return;
    }

    toast.add({
      title: `${allowed} allowed, ${limited} rate limited`,
      description: getFriendlyErrorMessage(
        responses.find((response) => response.status === "rejected")?.reason
      ),
      color: "warning",
      icon: "i-lucide-gauge"
    });
  }

  return {
    lastRun,
    pending,
    runRequests,
    limit: LIMIT,
    windowSeconds: WINDOW_SECONDS
  };
}
