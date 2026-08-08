import { afterEach, describe, expect, it, vi } from "vitest";
import {
  paginateStorageEntries,
  type StorageListEntry,
  withStorageListingDeadline
} from "../src/runtime/server/utils/storage-listing";

const entries: StorageListEntry[] = ["pages:a", "pages:b", "pages:c"].map((key) => ({
  key,
  metadata: null,
  path: null
}));

describe("paginateStorageEntries", () => {
  it("returns a key cursor that advances to the following entries", () => {
    expect(paginateStorageEntries(entries, 2)).toMatchObject({
      items: [{ key: "pages:a" }, { key: "pages:b" }],
      nextCursor: "pages:b"
    });
    expect(paginateStorageEntries(entries, 2, undefined, "pages:b")).toMatchObject({
      items: [{ key: "pages:c" }],
      nextCursor: null
    });
  });

  it("gives a requested page precedence over a cursor", () => {
    expect(paginateStorageEntries(entries, 1, 2, "pages:c")).toMatchObject({
      items: [{ key: "pages:b" }],
      nextCursor: "pages:b"
    });
  });

  it("returns an empty page for a cursor beyond the result set", () => {
    expect(paginateStorageEntries(entries, 2, undefined, "pages:z")).toEqual({
      items: [],
      nextCursor: null
    });
  });
});

describe("withStorageListingDeadline", () => {
  afterEach(() => vi.useRealTimers());

  it("contains late driver rejection after the response deadline", async () => {
    vi.useFakeTimers();
    let rejectOperation: (reason?: unknown) => void = () => undefined;
    const operation = new Promise<never>((_resolve, reject) => {
      rejectOperation = reject;
    });
    const deadline = withStorageListingDeadline(operation);
    const deadlineExpectation = expect(deadline).rejects.toBeInstanceOf(Error);

    await vi.advanceTimersByTimeAsync(10_000);
    await deadlineExpectation;

    rejectOperation(new Error("driver rejected after deadline"));
    await Promise.resolve();
  });
});
