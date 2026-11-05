import { describe, expect, it, vi } from "vitest";
import {
  computed,
  createRenderer,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef
} from "vue";
import { renderToString } from "vue/server-renderer";
import type { LoopsLmxAst, LoopsLmxElement, LoopsLmxVariables } from "@onderwijsin/loops-core";
import type {
  LoopsRendererColorMapper,
  LoopsRendererConfig,
  LoopsRendererTheme
} from "../src/runtime/types";

vi.mock("#imports", async () => ({
  computed: (await import("vue")).computed,
  useAppConfig: () => ({})
}));

import { useLoopsNodeStyles } from "../src/runtime/app/composables/node-styles";
import LoopsRenderer from "../src/runtime/app/components/LoopsRenderer.vue";
import LoopsAstNode from "../src/runtime/app/components/nodes/LoopsAstNode.vue";
import LoopsAstInline from "../src/runtime/app/components/nodes/LoopsAstInline.vue";
import LoopsAstTextBlock from "../src/runtime/app/components/nodes/LoopsAstTextBlock.vue";
import LoopsAstLayout from "../src/runtime/app/components/nodes/LoopsAstLayout.vue";
import LoopsAstSection from "../src/runtime/app/components/nodes/LoopsAstSection.vue";
import LoopsAstComponent from "../src/runtime/app/components/nodes/LoopsAstComponent.vue";
import LoopsAstMedia from "../src/runtime/app/components/nodes/LoopsAstMedia.vue";
import LoopsAstList from "../src/runtime/app/components/nodes/LoopsAstList.vue";
import LoopsAstListItem from "../src/runtime/app/components/nodes/LoopsAstListItem.vue";
import LoopsAstCodeBlock from "../src/runtime/app/components/nodes/LoopsAstCodeBlock.vue";
import LoopsAstIcons from "../src/runtime/app/components/nodes/LoopsAstIcons.vue";
import LoopsAstUnsupportedNodes from "../src/runtime/app/components/nodes/LoopsAstUnsupportedNodes.vue";

const components = {
  LoopsAstUnsupportedNodes,
  LoopsAstNode,
  LoopsAstInline,
  LoopsAstTextBlock,
  LoopsAstLayout,
  LoopsAstSection,
  LoopsAstComponent,
  LoopsAstMedia,
  LoopsAstList,
  LoopsAstListItem,
  LoopsAstCodeBlock,
  LoopsAstIcons,
  UButton: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h("a", slots.default?.())
  }),
  UIcon: defineComponent({ setup: () => () => h("i") }),
  DevOnly: defineComponent({ setup: () => () => null })
};
const variables: LoopsLmxVariables = { contact: {}, event: {}, data: {} };

/**
 * Builds a wire-format element without bypassing AST validation in the root renderer.
 *
 * @param name - LMX element name.
 * @param attributes - Authored presentation attributes.
 * @param children - Nested elements, or a default text child when omitted.
 * @returns A source element for the renderer boundary.
 */
function element(
  name: string,
  attributes: Record<string, string> = {},
  children: LoopsLmxElement[] = []
): LoopsLmxElement {
  return {
    type: "element",
    name,
    attributes,
    children: children.length ? children : [{ type: "text", value: name }]
  };
}

/**
 * Renders the public root with the same recursive component registration Nuxt supplies.
 *
 * @param data - Source AST to validate and render.
 * @param config - Consumer runtime policy.
 * @returns Server-rendered HTML.
 */
async function render(data: LoopsLmxAst, config: LoopsRendererConfig = {}) {
  const app = createSSRApp(LoopsRenderer, { data, variables, config });
  for (const [name, component] of Object.entries(components)) app.component(name, component);
  return renderToString(app);
}

describe("color mapping across renderer components", () => {
  it("preserves nested background context and explicit inline overrides during SSR", async () => {
    const mapColor = vi.fn(() => undefined);
    const data: LoopsLmxAst = {
      type: "root",
      children: [
        element("Section", { blockColor: "#fff" }, [
          element("Component", { blockColor: "#eee" }, [
            element("Section", { blockColor: "#ddd" }, [
              element("Paragraph", { textColor: "#111" }, [element("Text", { textColor: "#222" })])
            ])
          ]),
          element("Paragraph", { textColor: "#333" })
        ])
      ]
    };
    const html = await render(data, { mapColor });
    expect(html).toContain("color:#222");
    expect(mapColor).toHaveBeenCalledWith(
      "#222",
      expect.objectContaining({
        nodeName: "Text",
        backgroundColor: "#ddd",
        parentBackgroundColor: "#ddd"
      })
    );
    expect(mapColor).toHaveBeenCalledWith(
      "#ddd",
      expect.objectContaining({
        nodeName: "Section",
        backgroundColor: "#ddd",
        parentBackgroundColor: "#eee"
      })
    );
    expect(mapColor).toHaveBeenCalledWith(
      "#333",
      expect.objectContaining({ backgroundColor: "#fff" })
    );
  });

  it("maps linked and fallback button pairs, columns, lists, code, media and supported icon styles", async () => {
    const mapColor = vi.fn<LoopsRendererColorMapper>(
      (color, context) => `var(--${context.nodeName}-${context.property})`
    );
    const data: LoopsLmxAst = {
      type: "root",
      children: [
        element("Button", { href: "https://example.com", textColor: "#fff", bgColor: "#111" }),
        element("Button", { href: "javascript:alert(1)", textColor: "#fff", bgColor: "#222" }),
        element("Columns", { blockColor: "#333" }, [element("ColumnItem", { blockColor: "#444" })]),
        element("OrderedList", { textColor: "#555" }, [
          element("ListItem", { blockColor: "#666" }, [element("Text", { textColor: "#777" })])
        ]),
        element("CodeBlock", { textColor: "#888", blockColor: "#999" }),
        element("Divider", { color: "#aaa" }),
        element("Icons", { color: "#bbb" }, [element("Icon", { name: "github" })]),
        element("Image", { src: "https://example.com/image.png", borderColor: "#ccc" })
      ]
    };
    const original = JSON.stringify(data);
    const html = await render(data, { mapColor, sourceTheme: "light", targetTheme: "dark" });
    expect(html).toContain("background-color:var(--Button-backgroundColor)");
    expect(html).toContain(
      '<span style="background-color:var(--Button-backgroundColor);color:var(--Button-color);"'
    );
    expect(html).toContain("background-color:var(--ColumnItem-backgroundColor)");
    expect(html).toContain("color:var(--CodeBlock-color)");
    expect(html).toContain("border-color:var(--Divider-borderColor)");
    expect(html).toContain("border-color:var(--Icons-borderColor)");
    expect(html).toContain('src="https://example.com/image.png"');
    expect(html).not.toContain("javascript:");
    expect(mapColor).toHaveBeenCalledWith(
      "#777",
      expect.objectContaining({ backgroundColor: "#666" })
    );
    expect(mapColor).toHaveBeenCalledWith(
      "#fff",
      expect.objectContaining({ colors: { color: "#fff", backgroundColor: "#222" } })
    );
    expect(JSON.stringify(data)).toBe(original);
  });

  it("preserves rendered output for an undefined mapper result and skips disabled styles", async () => {
    const data: LoopsLmxAst = {
      type: "root",
      children: [element("Paragraph", { textColor: "#123", paddingTop: "16" })]
    };
    expect(await render(data, { mapColor: () => undefined })).toBe(await render(data));
    const mapColor = vi.fn(() => "#fff");
    const html = await render(data, { applyInlineStyles: false, mapColor });
    expect(mapColor).not.toHaveBeenCalled();
    expect(html).not.toContain("padding-top:16px");
    expect(html).not.toContain("color:#");
  });

  it("updates mounted styles when the consumer switches themes, reusing the same AST", async () => {
    // A platform-neutral Vue host proves component reactivity without browser-only APIs.
    interface HostNode {
      type: string;
      children: HostNode[];
      parent: HostNode | null;
      props: Record<string, unknown>;
    }
    const makeNode = (type: string): HostNode => ({ type, children: [], parent: null, props: {} });
    const host = createRenderer<HostNode, HostNode>({
      createElement: makeNode,
      createText: () => makeNode("text"),
      createComment: () => makeNode("comment"),
      setText: () => {},
      setElementText: () => {},
      parentNode: (node) => node.parent,
      nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
      patchProp: (node, key, _previous, value) => {
        node.props[key] = value;
      },
      insert: (node, parent, anchor) => {
        node.parent = parent;
        const index = anchor ? parent.children.indexOf(anchor) : -1;
        if (index < 0) parent.children.push(node);
        else parent.children.splice(index, 0, node);
      },
      remove: (node) => {
        const siblings = node.parent?.children;
        if (siblings) siblings.splice(siblings.indexOf(node), 1);
      }
    });
    const theme = shallowRef<LoopsRendererTheme>("light");
    const node = element("Paragraph", { textColor: "#123" });
    const config = computed<LoopsRendererConfig>(() => ({
      sourceTheme: "light",
      targetTheme: theme.value,
      mapColor: (color, context) => (context.targetTheme === "dark" ? "var(--text-dark)" : color)
    }));
    const app = host.createApp(
      defineComponent({
        setup() {
          const style = useLoopsNodeStyles(
            () => node,
            () => config.value
          );
          return () => h("p", { style: style.value });
        }
      })
    );
    const root = makeNode("root");
    app.mount(root);
    const paragraph = root.children.find((node) => node.type === "p");
    expect(paragraph?.props.style).toEqual({ color: "#123" });
    theme.value = "dark";
    await nextTick();
    expect(paragraph?.props.style).toEqual({ color: "var(--text-dark)" });
    theme.value = "light";
    await nextTick();
    expect(paragraph?.props.style).toEqual({ color: "#123" });
    app.unmount();
  });
});
