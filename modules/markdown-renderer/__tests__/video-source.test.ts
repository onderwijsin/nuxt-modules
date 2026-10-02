import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseMarkdown } from "comark";

const config = vi.hoisted((): { markdownRenderer: { videoBaseUrl?: string } } => ({
  markdownRenderer: {}
}));
vi.mock("#app", () => ({ useAppConfig: () => config }));

import { videoSourcePlugin } from "../src/runtime/app/comark-plugins/video-source";

describe("video source plugin", () => {
  beforeEach(() => {
    config.markdownRenderer.videoBaseUrl = "https://media.example.com/assets/";
  });

  it.each(["clip.mp4", "/clip.mp4"])("prefixes the relative video source %s", async (src) => {
    const result = await parseMarkdown(`:video{src="${src}" controls}`, {
      plugins: [videoSourcePlugin()]
    });
    expect(result.nodes).toEqual([
      ["video", { src: "https://media.example.com/assets/clip.mp4", ":controls": "true" }]
    ]);
  });

  it.each([
    "https://other.example.com/clip.mp4",
    "http://other.example.com/clip.mp4",
    "//other.example.com/clip.mp4",
    "blob:https://example.com/id",
    "data:video/mp4;base64,AAAA"
  ])("preserves the absolute source %s", async (src) => {
    const result = await parseMarkdown(`:video{src="${src}"}`, { plugins: [videoSourcePlugin()] });
    expect(result.nodes).toEqual([["video", { src }]]);
  });

  it("leaves other elements and videos without a source unchanged", async () => {
    const source = ':img{src="image.png"} :video{controls}';
    expect(await parseMarkdown(source, { plugins: [videoSourcePlugin()] })).toEqual(
      await parseMarkdown(source)
    );
  });

  it("rewrites nested videos while preserving query strings, fragments, and source children", async () => {
    const result = await parseMarkdown(
      '<div><video src="clip.mp4?download=1#t=10"><source src="alternate.mp4"></video></div>',
      {
        plugins: [videoSourcePlugin()]
      }
    );
    expect(result.nodes).toMatchObject([
      [
        "div",
        {},
        [
          "video",
          { src: "https://media.example.com/assets/clip.mp4?download=1#t=10" },
          ["source", { src: "alternate.mp4" }]
        ]
      ]
    ]);
  });

  it("captures the base URL separately for each plugin instance", async () => {
    const first = videoSourcePlugin();
    config.markdownRenderer.videoBaseUrl = "https://other.example.com/";
    const second = videoSourcePlugin();
    expect((await parseMarkdown(':video{src="clip.mp4"}', { plugins: [first] })).nodes).toEqual([
      ["video", { src: "https://media.example.com/assets/clip.mp4" }]
    ]);
    expect((await parseMarkdown(':video{src="clip.mp4"}', { plugins: [second] })).nodes).toEqual([
      ["video", { src: "https://other.example.com/clip.mp4" }]
    ]);
  });

  it("reports a missing base URL when explicitly initialized", () => {
    config.markdownRenderer.videoBaseUrl = undefined;
    expect(() => videoSourcePlugin()).toThrow("videoBaseUrl is not defined in the app config.");
  });
});
