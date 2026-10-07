import { createRequire } from "node:module";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

describe("markdown renderer module", async () => {
  const requireVue = createRequire(createRequire(import.meta.url).resolve("vue"));
  const vuePackages = [
    "vue",
    "@vue/runtime-dom",
    "@vue/runtime-core",
    "@vue/reactivity",
    "@vue/shared",
    "@vue/server-renderer"
  ];
  // Nitro can trace another Vue patch from the workspace into the standalone server.
  // Resolve the runtime graph from this fixture's Vue and bundle Comark with it so
  // component resolution and SSR slots use the same runtime instance.
  await setupFixture(import.meta.url, "basic", {
    nuxtConfig: {
      nitro: {
        alias: Object.fromEntries(
          vuePackages.map((name) => [name, dirname(requireVue.resolve(`${name}/package.json`))])
        ),
        externals: { inline: [...vuePackages, "@comark/vue"] }
      }
    }
  });

  it("serves built-in and consumer renderer metadata alongside webmanifest", async () => {
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
  });

  it("omits unrelated application and UI components from metadata", async () => {
    const names = await $fetch<string[]>("/api/component-registry");
    expect(names).toContain("MarkdownButton");
    expect(names).toContain("RendererMarkdownHero");
    expect(names).not.toContain("Unrelated");
    expect(names).not.toContain("UButton");
  });

  it("renders relative video sources through the lazily loaded plugin during SSR", async () => {
    await expect($fetch("/")).resolves.toContain('src="https://media.example.com/assets/clip.mp4"');
  });

  it("resolves styled Prose paragraphs during SSR with a component set", async () => {
    const html = await $fetch<string>("/");
    expect(html).toMatch(
      /<p[^>]*class="[^"]*\bmarkdown-prose-proof\b[^"]*"[^>]*><!--\[-->Some content<!--\]--><\/p>/u
    );
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
