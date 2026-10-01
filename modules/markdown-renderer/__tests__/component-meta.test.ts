import { beforeEach, describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock("@nuxt/kit", () => ({ useLogger: () => logger }));

import { transformMarkdownComponentMeta } from "../src/config/component-meta";

describe("Markdown component metadata macro", () => {
  beforeEach(() => logger.warn.mockClear());

  it("warns about invalid nested macro configuration instead of silently dropping it", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Hero",
        type: "block",
        props: { actions: { items: { properties: { to: { imput: "url" } } } } }
      })
    ).toEqual({ markdownRenderer: {} });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Invalid defineEditorComponentSchema metadata "Hero"')
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("props.actions.items.properties.to")
    );
  });

  it("namespaces the concise component metadata contract", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Callout",
        description: "Highlights important information.",
        type: "block",
        deprecated: true,
        props: {
          color: {
            values: ["primary", "warning"],
            deprecated: { text: "Use tone instead." }
          },
          image: { input: "image" },
          href: { input: "url" }
        }
      })
    ).toEqual({
      markdownRenderer: {
        label: "Callout",
        description: "Highlights important information.",
        nodeType: "block",
        tags: [{ name: "deprecated" }],
        props: {
          color: {
            values: ["primary", "warning"],
            tags: [{ name: "deprecated", text: "Use tone instead." }]
          },
          image: { tags: [{ name: "specialInputType", text: "image" }] },
          href: { tags: [{ name: "specialInputType", text: "url" }] }
        }
      }
    });
  });

  it("preserves supported explicit prop overrides", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Gallery",
        type: "inline",
        props: {
          items: {
            type: "array",
            description: "Selected items.",
            default: [],
            required: true
          }
        }
      })
    ).toEqual({
      markdownRenderer: {
        label: "Gallery",
        nodeType: "inline",
        props: {
          items: {
            type: "array",
            description: "Selected items.",
            default: [],
            required: true
          }
        }
      }
    });
  });

  it("transforms editor controls recursively", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Hero",
        type: "block",
        props: {
          image: { properties: { src: { input: "image" } } },
          actions: {
            items: {
              properties: {
                to: { input: "url" },
                icon: { input: { type: "icon", collections: ["lucide"] }, deprecated: true }
              }
            }
          }
        }
      })
    ).toMatchObject({
      markdownRenderer: {
        props: {
          image: { properties: { src: { tags: [{ name: "specialInputType", text: "image" }] } } },
          actions: {
            items: {
              properties: {
                to: { tags: [{ name: "specialInputType", text: "url" }] },
                icon: {
                  tags: [
                    { name: "specialInputType", text: "icon", config: { collections: ["lucide"] } },
                    { name: "deprecated" }
                  ]
                }
              }
            }
          }
        }
      }
    });
  });

  it("warns when a configured input omits required options", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Hero",
        type: "block",
        props: { icon: { input: { type: "icon" } } }
      })
    ).toEqual({ markdownRenderer: {} });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("props.icon.input"));
  });

  it("treats bare and object forms of an unconfigured input equally", () => {
    const result = transformMarkdownComponentMeta({
      label: "Hero",
      type: "block",
      props: {
        imageA: { input: "image" },
        imageB: { input: { type: "image" } },
        linkA: { input: "url" },
        linkB: { input: { type: "url" } }
      }
    });

    expect(result).toMatchObject({
      markdownRenderer: {
        props: {
          imageA: { tags: [{ name: "specialInputType", text: "image" }] },
          imageB: { tags: [{ name: "specialInputType", text: "image" }] },
          linkA: { tags: [{ name: "specialInputType", text: "url" }] },
          linkB: { tags: [{ name: "specialInputType", text: "url" }] }
        }
      }
    });
  });

  it("rejects undeclared input configuration", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Hero",
        type: "block",
        props: { image: { input: { type: "image", arbitrary: true } } }
      })
    ).toEqual({ markdownRenderer: {} });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("props.image.input"));
  });

  it("turns string deprecation guidance into tags at component and nested prop level", () => {
    expect(
      transformMarkdownComponentMeta({
        label: "Hero",
        type: "block",
        deprecated: "Use Banner instead.",
        props: { image: { properties: { src: { deprecated: "Use assetId instead." } } } }
      })
    ).toMatchObject({
      markdownRenderer: {
        tags: [{ name: "deprecated", text: "Use Banner instead." }],
        props: {
          image: {
            properties: {
              src: { tags: [{ name: "deprecated", text: "Use assetId instead." }] }
            }
          }
        }
      }
    });
  });
});
