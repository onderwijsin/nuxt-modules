import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown renderer module", async () => {
  await setupFixture(import.meta.url);

  it("serves generated metadata for built-in and consumer renderer components", async () => {
    await expect($fetch("/api/markdown-renderer/components/demo")).resolves.toMatchObject([
      {
        name: "MarkdownButton",
        label: "Button",
        nodeType: "block",
        props: {
          label: { description: "Label displayed inside the button." },
          color: {
            values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
          },
          variant: { values: ["solid", "outline", "soft", "subtle", "ghost", "link"] },
          icon: {
            tags: [{ name: "specialInputType", text: "icon", config: { collections: ["lucide"] } }]
          }
        }
      },
      {
        name: "MarkdownCallout",
        label: "Callout",
        nodeType: "block",
        props: {
          color: {
            values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
          },
          actions: {
            items: {
              properties: {
                label: { description: "Label displayed inside the button." },
                icon: {
                  tags: [
                    {
                      name: "specialInputType",
                      text: "icon",
                      config: { collections: ["lucide"] }
                    },
                    { name: "deprecated" }
                  ]
                }
              }
            }
          }
        },
        slots: ["description"]
      },
      {
        name: "MarkdownHero",
        label: "Hero",
        description: "A consumer-defined page introduction.",
        nodeType: "block",
        props: {
          align: { values: ["left", "center"] },
          actionTo: { tags: [{ name: "specialInputType", text: "url" }] }
        },
        slots: ["default"]
      }
    ]);
  });

  it("rejects unknown component sets", async () => {
    await expect($fetch("/api/markdown-renderer/components/missing")).rejects.toMatchObject({
      statusCode: 404
    });
  });
});
