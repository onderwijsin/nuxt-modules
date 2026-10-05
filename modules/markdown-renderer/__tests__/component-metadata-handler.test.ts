import { beforeEach, describe, expect, it, vi } from "vitest";

const h3 = vi.hoisted(() => ({
  createError: vi.fn((value: { statusCode: number; statusMessage: string }) =>
    Object.assign(new Error(value.statusMessage), value)
  ),
  defineEventHandler: vi.fn((handler) => handler),
  getRouterParam: vi.fn(),
  handleCors: vi.fn()
}));

vi.mock("h3", () => h3);

import { createComponentMetadataHandler } from "../src/runtime/server/utils/component-metadata-handler";

describe("component metadata handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h3.getRouterParam.mockReturnValue(undefined);
    h3.handleCors.mockReturnValue(false);
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

  it("filters metadata to the requested component set", () => {
    h3.getRouterParam.mockReturnValue("landing");
    const handler = createComponentMetadataHandler(
      {
        MarkdownHero: { meta: { props: [], slots: [] } },
        MarkdownButton: { meta: { props: [], slots: [] } }
      },
      [
        { name: "MarkdownHero", componentName: "MarkdownHero" },
        { name: "MarkdownButton", componentName: "MarkdownButton" }
      ],
      { landing: ["MarkdownHero"] },
      "*"
    );

    expect(Reflect.apply(handler, undefined, [{}])).toEqual([
      expect.objectContaining({ name: "MarkdownHero" })
    ]);
  });

  it.each([undefined, "article"])("omits Reference from metadata (%s)", (componentSet) => {
    h3.getRouterParam.mockReturnValue(componentSet);
    const handler = createComponentMetadataHandler(
      { MarkdownReference: { meta: { props: [], slots: [] } } },
      [{ name: "Reference", componentName: "MarkdownReference" }],
      { article: ["Reference"] },
      "*"
    );

    expect(Reflect.apply(handler, undefined, [{}])).toEqual([]);
  });

  it("returns not found for an unknown component set", () => {
    h3.getRouterParam.mockReturnValue("missing");
    const handler = createComponentMetadataHandler({}, [], {}, "*");

    expect(() => Reflect.apply(handler, undefined, [{}])).toThrow(
      "Unknown Markdown renderer component set: missing"
    );

    expect(h3.createError).toHaveBeenCalledWith({
      statusCode: 404,
      statusMessage: "Unknown Markdown renderer component set: missing"
    });
  });
});
