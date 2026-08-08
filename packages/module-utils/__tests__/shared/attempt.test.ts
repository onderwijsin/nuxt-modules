import { describe, expect, it, vi } from "vitest";
import { attempt, attemptWithRetry } from "../../src/shared/attempt";

describe("attempt", () => {
  it("returns successful synchronous operation data", async () => {
    await expect(attempt(() => "done")).resolves.toEqual({ data: "done", error: null });
  });

  it("returns rejected operation errors as data", async () => {
    const error = new Error("failed");

    await expect(attempt(() => Promise.reject(error))).resolves.toEqual({ data: null, error });
  });

  it("captures synchronously thrown errors", async () => {
    const error = new Error("failed");

    await expect(
      attempt(() => {
        throw error;
      })
    ).resolves.toEqual({ data: null, error });
  });
});

describe("attemptWithRetry", () => {
  it("retries with exponential backoff until the operation succeeds", async () => {
    vi.useFakeTimers();
    const operation = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockResolvedValue("done");

    const resultPromise = attemptWithRetry(operation, { attempts: 3, delayMs: 10 });

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(20);

    await expect(resultPromise).resolves.toEqual({ data: "done", error: null });
    expect(operation).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("returns the final error when the retry budget is exhausted", async () => {
    const error = new Error("failed");
    const operation = vi.fn().mockRejectedValue(error);

    await expect(attemptWithRetry(operation, { attempts: 2, delayMs: 0 })).resolves.toEqual({
      data: null,
      error
    });
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the attempt budget is one", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("failed"));

    await expect(attemptWithRetry(operation, { attempts: 1 })).resolves.toMatchObject({
      data: null
    });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("uses a fixed delay when exponential backoff is disabled", async () => {
    vi.useFakeTimers();
    const operation = vi.fn().mockRejectedValue(new Error("failed"));
    const resultPromise = attemptWithRetry(operation, {
      attempts: 3,
      delayMs: 10,
      exponentialBackoff: false
    });

    await vi.advanceTimersByTimeAsync(10);
    await vi.advanceTimersByTimeAsync(10);

    await expect(resultPromise).resolves.toMatchObject({ data: null });
    expect(operation).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });
});
