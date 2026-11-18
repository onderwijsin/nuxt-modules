import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";
import type { EditorComponentOutput } from "../src/schema/editor-component-schema";

describe("markdown renderer module", async () => {
  await setupFixture(import.meta.url);

  it("serves built-in and consumer renderer metadata alongside webmanifest", async () => {
    const metadata = await $fetch<EditorComponentOutput[]>(
      "/api/markdown-renderer/components/demo"
    );
    expect(metadata).toMatchObject([
      {
        name: "ItemList",
        label: "Item list",
        nodeType: "block",
        props: {
          divide: { type: "boolean", default: false },
          items: {
            type: "array",
            required: true,
            items: {
              type: "object",
              properties: {
                image: {
                  type: "string",
                  tags: [{ name: "specialInputType", text: "image" }]
                },
                title: { type: "string" },
                description: { type: "string" },
                to: {
                  type: "string",
                  tags: [{ name: "specialInputType", text: "url" }]
                },
                external: { type: "boolean" },
                icon: {
                  type: "string",
                  tags: [
                    { name: "specialInputType", text: "icon", config: { collections: ["lucide"] } }
                  ]
                }
              }
            }
          }
        },
        slots: []
      },
      {
        name: "MarkdownAnchor",
        label: "Anchor",
        nodeType: "block",
        props: { id: { name: "id", type: "string", required: true } },
        slots: []
      },
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
                    }
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
    expect(metadata.some((component) => component.name === "RelatedItemList")).toBe(false);
    const itemProperties = metadata.find((component) => component.name === "ItemList")?.props.items
      ?.items?.properties;
    for (const property of Object.values(itemProperties ?? {})) {
      expect(property.required).not.toBe(true);
    }
  });

  it("omits unrelated application and UI components from metadata", async () => {
    const names = await $fetch<string[]>("/api/component-registry");
    expect(names).toContain("MarkdownButton");
    expect(names).toContain("MarkdownItemList");
    expect(names).toContain("MarkdownRelatedItemList");
    expect(names).not.toContain("ItemList");
    expect(names).not.toContain("RelatedItemList");
    expect(names).toContain("RendererMarkdownHero");
    expect(names).not.toContain("Unrelated");
    expect(names).not.toContain("UButton");
  });

  it("renders relative video sources through the lazily loaded plugin during SSR", async () => {
    await expect($fetch("/")).resolves.toContain('src="https://media.example.com/assets/clip.mp4"');
  });

  it("resolves Reference links through referenceConfig.linkResolver", async () => {
    const html = await $fetch<string>("/");
    expect(html).toContain('href="/articles/reference-example"');
    expect(html).toContain("Reference config proof");
  });

  it("renders a block anchor as an empty span with its fragment identifier", async () => {
    await expect($fetch("/")).resolves.toContain(
      '<span id="existing-fragment" class="markdown-anchor"></span>'
    );
  });

  it("resolves styled Prose paragraphs during SSR with a component set", async () => {
    const html = await $fetch<string>("/");
    expect(html).toMatch(
      /<p[^>]*class="[^"]*\bmarkdown-prose-proof\b[^"]*"[^>]*><!--\[-->Some content<!--\]--><\/p>/u
    );
  });

  it("renders item lists with images, optional fields, and internal or external links", async () => {
    const page = await $fetch<string>("/");
    const html = page.match(/<section id="item-list-example">([\s\S]*?)<\/section>/u)?.[1] ?? "";
    expect(html.match(/<li\b/gu)).toHaveLength(4);
    expect(html).toContain("after:h-px");
    expect(html).toContain('src="/assets/list-image.svg"');
    expect(html).toContain("Image item");
    expect(html).toContain("Image wins over icon.");
    expect(html).not.toContain("i-lucide-image");
    expect(html).toContain("i-lucide:info");
    const externalLink = html.match(/<a\b[^>]*href="https:\/\/example\.com\/item"[^>]*>/u)?.[0];
    expect(externalLink).toContain('target="_blank"');
    expect(externalLink).toContain("noopener");
    const internalLink = html.match(/<a\b[^>]*href="\/internal-item"[^>]*>/u)?.[0];
    expect(internalLink).toBeDefined();
    expect(internalLink).not.toContain('target="_blank"');
    expect(html.match(/target="_blank"/gu)).toHaveLength(1);
    expect(html).toContain("Description only");
  });

  it("renders CMS-owned related items in source order through the consumer mapping", async () => {
    const html = await $fetch<string>("/");
    expect(html).toContain("Explore the routes into teaching.");
    expect(html).toContain("24 months");
    expect(html).toContain('src="/assets/image-uuid"');
    expect(html).toContain('href="/articles/becoming-a-teacher"');
    expect(html).toContain('href="/programs/teaching-traineeship"');
    expect(html.indexOf("Becoming a teacher")).toBeLessThan(html.indexOf("Teaching traineeship"));
    expect(html).not.toMatch(/<related-item-list\b/iu);
  });

  it("renders Markdown images with the specified width attribute during SSR", async () => {
    const html = await $fetch<string>("/");
    const image = html.match(/<img\b[^>]*\balt="Alt text"[^>]*>/u)?.[0];
    expect(image).toBeDefined();
    expect(image).toMatch(/\salt="Alt text"/u);
    expect(image).toContain("/assets/4b4849c5-fdcf-4522-b090-adb9530ff526");
    expect(image).toMatch(/\swidth="300"/u);
  });

  it("rejects unknown component sets", async () => {
    await expect($fetch("/api/markdown-renderer/components/missing")).rejects.toMatchObject({
      statusCode: 404
    });
  });
});
