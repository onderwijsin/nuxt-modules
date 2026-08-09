import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const h3Mocks = vi.hoisted(() => ({
  createError: vi.fn((error: Record<string, unknown>) => Object.assign(new Error(), error)),
  getRouterParam: vi.fn(),
  readBody: vi.fn()
}));
const { createError, getRouterParam, readBody } = h3Mocks;
const useAllowedStorage = vi.fn();

vi.mock("h3", async () => ({
  ...(await vi.importActual<typeof import("h3")>("h3")),
  createError: h3Mocks.createError,
  defineEventHandler: (handler: unknown) => handler,
  getRouterParam: h3Mocks.getRouterParam,
  readBody: h3Mocks.readBody
}));
vi.mock("../src/runtime/server/utils/storage-admin", () => ({ useAllowedStorage }));

describe("storage clear routes", () => {
  beforeEach(() => {
    vi.resetModules();
    createError.mockClear();
    getRouterParam.mockReset();
    readBody.mockReset();
    useAllowedStorage.mockReset();
    getRouterParam.mockReturnValue("cache");
    readBody.mockResolvedValue({ confirm: true, prefix: "kennisbank:articles" });
  });

  it("clears a permitted prefix through the storage driver's native clear method", async () => {
    const clear = vi.fn();
    useAllowedStorage.mockReturnValue({ storage: { clear } });
    const handler = (
      await import("../src/runtime/server/api/_storage/[mount]/actions/delete-by-prefix.post")
    ).default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({
      data: { prefix: "kennisbank:articles", cleared: true }
    });
    expect(useAllowedStorage).toHaveBeenCalledWith(event, "cache", "delete", "kennisbank:articles");
    expect(clear).toHaveBeenCalledWith("kennisbank:articles");
  });

  it("clears the mount only through an explicitly confirmed root operation", async () => {
    const clear = vi.fn();
    readBody.mockResolvedValue({ confirm: true });
    useAllowedStorage.mockReturnValue({ storage: { clear } });
    const handler = (await import("../src/runtime/server/api/_storage/[mount]/actions/clear.post"))
      .default;
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({ data: { mount: "cache", cleared: true } });
    expect(useAllowedStorage).toHaveBeenCalledWith(event, "cache", "delete", "");
    expect(clear).toHaveBeenCalledWith();
  });

  it("requires an explicit confirmation before clearing storage", async () => {
    readBody.mockResolvedValue({ prefix: "kennisbank:articles", confirm: false });
    const handler = (
      await import("../src/runtime/server/api/_storage/[mount]/actions/delete-by-prefix.post")
    ).default;

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(useAllowedStorage).not.toHaveBeenCalled();
  });
});
