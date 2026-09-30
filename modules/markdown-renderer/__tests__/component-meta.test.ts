import { describe, expect, it } from "vitest";

import { transformMarkdownComponentMeta } from "../src/config/component-meta";

describe("Markdown component metadata macro", () => {
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
          image: { tags: [{ name: "editor", text: "image" }] },
          href: { tags: [{ name: "editor", text: "url" }] }
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
});
