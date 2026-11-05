import { describe, expect, it, vi } from "vitest";
import type { LoopsLmxNode } from "@onderwijsin/loops-core";
import { resolveSafeLoopsLmxUrl } from "@onderwijsin/loops-core";
import {
  getRenderingExample,
  getWorkshopExamples
} from "../playground/server/utils/email-examples";
import { createWorkshopConfig } from "../playground/app/utils/workshop-colors";
import { resolveLoopsRendererStyles } from "../src/runtime/app/utils/styles";

vi.mock("#imports", async () => ({
  createLoopsColorMapper: (await import("../src/runtime/app/utils/color-mapper-approximation"))
    .createLoopsColorMapper
}));

/**
 * Flattens a sample email for assertions about the content consumers actually render.
 * @param nodes - Parsed source nodes.
 * @returns All nodes in document order.
 */
function flatten(nodes: LoopsLmxNode[]): LoopsLmxNode[] {
  return nodes.flatMap((node) =>
    node.type === "element" ? [node, ...flatten(node.children)] : [node]
  );
}

describe("playground email examples", () => {
  it("parses a complete newsletter covering every supported node family without diagnostics", async () => {
    const notebookUrl = "https://example.com/images/northstar-notebook.svg";
    const example = await getRenderingExample(notebookUrl);
    const nodes = flatten(example.ast.children);
    const names = new Set(nodes.flatMap((node) => (node.type === "element" ? [node.name] : [])));
    for (const name of [
      "Style",
      "Component",
      "Section",
      "Columns",
      "ColumnItem",
      "H1",
      "H2",
      "H3",
      "Paragraph",
      "Strong",
      "Em",
      "Underline",
      "Strike",
      "Code",
      "Text",
      "Link",
      "Br",
      "Quote",
      "OrderedList",
      "UnorderedList",
      "ListItem",
      "Button",
      "CodeBlock",
      "Divider",
      "Image",
      "Icons",
      "Icon"
    ]) {
      expect(names.has(name), `Missing showcase node: ${name}`).toBe(true);
    }
    expect(example.variables.contact?.firstName).toBe("Alex");
    expect(resolveSafeLoopsLmxUrl("{contact.notebookUrl}", example.variables, "image")).toBe(
      notebookUrl
    );
  });

  it("keeps the workshop content and structure identical across color variants", async () => {
    const { exact, nearby } = await getWorkshopExamples();
    const summarize = (nodes: LoopsLmxNode[]) =>
      flatten(nodes).map((node) =>
        node.type === "text"
          ? { text: node.value }
          : {
              name: node.name,
              attributes: Object.fromEntries(
                Object.entries(node.attributes).filter(([name]) => !/color$/i.test(name))
              )
            }
      );
    expect(summarize(exact.ast.children)).toEqual(summarize(nearby.ast.children));
    expect(exact.subject).toBe(nearby.subject);
    expect(exact.variables).toEqual(nearby.variables);
  });

  it("maps canonical surfaces exactly and nearby surfaces only when approximation is enabled", async () => {
    const { exact, nearby } = await getWorkshopExamples();
    const exactSection = flatten(exact.ast.children).find(
      (node) => node.type === "element" && node.name === "Section"
    );
    const nearSection = flatten(nearby.ast.children).find(
      (node) => node.type === "element" && node.name === "Section"
    );
    if (
      !exactSection ||
      exactSection.type !== "element" ||
      !nearSection ||
      nearSection.type !== "element"
    ) {
      throw new Error("The workshop fixture must include its session panel");
    }
    expect(
      resolveLoopsRendererStyles(exactSection, createWorkshopConfig("dark", 0)).styles
        .backgroundColor
    ).toBe("var(--mail-tint)");
    expect(
      resolveLoopsRendererStyles(nearSection, createWorkshopConfig("dark", 0)).styles
        .backgroundColor
    ).toBe("#eef5ff");
    expect(
      resolveLoopsRendererStyles(nearSection, createWorkshopConfig("dark", 0.03)).styles
        .backgroundColor
    ).toBe("var(--mail-tint)");
    expect(
      resolveLoopsRendererStyles(nearSection, createWorkshopConfig("light", 0.03)).styles
        .backgroundColor
    ).toBe("#eef5ff");
  });
});
