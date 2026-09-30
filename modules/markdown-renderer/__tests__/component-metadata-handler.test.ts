import { beforeEach, describe, expect, it, vi } from "vitest";

const h3 = vi.hoisted(() => ({
  createError: vi.fn((value) => value),
  defineEventHandler: vi.fn((handler) => handler),
  getRouterParam: vi.fn(),
  handleCors: vi.fn()
}));

vi.mock("h3", () => h3);

import { createComponentMetadataHandler } from "../src/runtime/server/utils/component-metadata-handler";

describe("component metadata handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds CORS headers to metadata responses", () => {
    const handler = createComponentMetadataHandler({}, [], {}, ["https://directus.example.com"]);

    Reflect.apply(handler, undefined, [{}]);

    expect(h3.handleCors).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        origin: ["https://directus.example.com"],
        methods: ["GET"]
      })
    );
  });

  it("stops processing after handling a preflight request", () => {
    h3.handleCors.mockReturnValue(true);
    const handler = createComponentMetadataHandler({}, [], {}, "*");

    expect(Reflect.apply(handler, undefined, [{}])).toBeUndefined();
    expect(h3.getRouterParam).not.toHaveBeenCalled();
  });
});
