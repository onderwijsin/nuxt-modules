import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";

const mocks = vi.hoisted(() => {
  /** @type {{ markdownRenderer: { videoBaseUrl?: string } }} */
  const config = { markdownRenderer: {} };
  return {
    config,
    load: vi.fn(),
    create: vi.fn(() => ({ name: "video-source" }))
  };
});
vi.mock("#app", () => ({ useAppConfig: () => mocks.config }));
vi.mock("#markdown-renderer/manifest", () => ({ resolveRendererComponent: vi.fn() }));
vi.mock("../src/runtime/app/comark-plugins/video-source", () => {
  mocks.load();
  return { videoSourcePlugin: mocks.create };
});

/**
 * Renders the wrapper and captures the plugins passed to Comark.
 * @param {import("comark").ComarkPlugin[]} [plugins] - Optional caller plugins.
 * @returns Rendered HTML and the captured Comark props.
 */
async function render(plugins) {
  const { default: MarkdownRenderer } =
    await import("../src/runtime/app/components/MarkdownRenderer.vue");
  const received = vi.fn();
  const app = createSSRApp(MarkdownRenderer, { value: "Hello", plugins });
  app.component(
    "Markdown",
    defineComponent({
      props: ["value", "plugins", "componentsManifest"],
      setup(props) {
        received(props.plugins);
        return () => h("p", props.value);
      }
    })
  );
  const html = await renderToString(app);
  return { html, received };
}

describe("MarkdownRenderer plugins", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.config.markdownRenderer = {};
  });

  it("does not load the video plugin when no base URL is configured", async () => {
    const custom = { name: "custom" };
    const { html, received } = await render([custom]);
    expect(html).toBe("<p>Hello</p>");
    expect(received).toHaveBeenCalledWith([custom]);
    expect(mocks.load).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("loads the configured video plugin and appends it without mutating caller plugins", async () => {
    mocks.config.markdownRenderer.videoBaseUrl = "https://media.example.com/";
    const plugins = [{ name: "custom" }];
    const { received } = await render(plugins);
    expect(mocks.load).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(received).toHaveBeenCalledWith([{ name: "custom" }, { name: "video-source" }]);
    expect(plugins).toEqual([{ name: "custom" }]);
  });

  it("supports omitted custom plugins with a configured base URL", async () => {
    mocks.config.markdownRenderer.videoBaseUrl = "https://media.example.com/";
    const { received } = await render();
    expect(received).toHaveBeenCalledWith([{ name: "video-source" }]);
  });
});
