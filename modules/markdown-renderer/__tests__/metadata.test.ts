import { describe, expect, it } from "vitest";

import { createEditorComponentMetadata } from "../src/runtime/server/utils/metadata";

describe("Markdown editor component metadata", () => {
  it("maps props and slots and omits the reserved Reference node", () => {
    const result = createEditorComponentMetadata(
      {
        MarkdownCallout: {
          meta: {
            description: "Supporting content.",
            markdownRenderer: {
              label: "Notice",
              nodeType: "inline",
              tags: [{ name: "deprecated", text: "Use Banner instead." }],
              props: {
                tone: {
                  values: ["neutral", "critical"],
                  tags: [{ name: "editor", text: "appearance" }]
                }
              }
            },
            props: [
              {
                name: "tone",
                type: '"info" | "warning"',
                description: "Visual tone.",
                required: true,
                default: "'info'",
                tags: [{ name: "editor", text: "style" }],
                schema: {
                  kind: "enum",
                  schema: [
                    { kind: "literal", value: "info" },
                    { kind: "literal", value: "warning" }
                  ]
                }
              }
            ],
            slots: [{ name: "default" }]
          }
        },
        MarkdownReference: { meta: { props: [], slots: [] } }
      },
      [
        { name: "MarkdownCallout", componentName: "MarkdownCallout" },
        { name: "Reference", componentName: "MarkdownReference" }
      ]
    );

    expect(result).toEqual([
      {
        name: "MarkdownCallout",
        label: "Notice",
        description: "Supporting content.",
        nodeType: "inline",
        props: {
          tone: {
            name: "tone",
            type: "string",
            description: "Visual tone.",
            required: true,
            default: "info",
            values: ["neutral", "critical"],
            tags: [{ name: "editor", text: "appearance" }]
          }
        },
        slots: ["default"],
        tags: [{ name: "deprecated", text: "Use Banner instead." }]
      }
    ]);
  });
});
