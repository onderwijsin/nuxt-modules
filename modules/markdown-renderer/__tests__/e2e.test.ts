import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown renderer module", async () => {
  await setupFixture(import.meta.url);

  it("serves generated metadata for prefixed renderer components", async () => {
    await expect($fetch("/api/markdown-renderer/components/demo")).resolves.toMatchObject([
      {
        name: "MarkdownButton",
        label: "Button",
        nodeType: "inline",
        props: {
          color: {
            values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
          },
          variant: { values: ["solid", "outline", "soft", "subtle", "ghost", "link"] }
        }
      },
      {
        name: "MarkdownCallout",
        label: "Callout",
        nodeType: "block",
        props: {
          color: {
            values: ["primary", "secondary", "success", "info", "warning", "error", "neutral"]
          }
        }
      }
    ]);
  });
});
