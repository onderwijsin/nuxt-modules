import { describe, expect, it } from "vitest";

import { createEditorComponentMetadata } from "../src/runtime/server/utils/metadata";

describe("Markdown editor component metadata", () => {
  it("maps props and slots and omits the reserved Reference node", () => {
    const result = createEditorComponentMetadata(
      {
        Callout: {
          meta: {
            description: "Supporting content.",
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
        Reference: { meta: { props: [], slots: [] } }
      },
      ["Callout", "Reference"]
    );

    expect(result).toEqual({
      components: [
        {
          name: "Callout",
          label: "Callout",
          description: "Supporting content.",
          nodeType: "block",
          props: {
            tone: {
              name: "tone",
              type: "string",
              description: "Visual tone.",
              required: true,
              default: "info",
              values: ["info", "warning"],
              tags: [{ name: "editor", text: "style" }]
            }
          },
          slots: ["default"]
        }
      ]
    });
  });
});
