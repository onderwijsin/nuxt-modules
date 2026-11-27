import { describe, expect, it, vi } from "vitest";
import type { H3Event } from "h3";
import { createTestEvent } from "../../../packages/test-utils/src";
import { registerMarkdownDocumentAiReady } from "../src/runtime/server/ai-ready";
import { createMarkdownDocumentService } from "../src/runtime/server/service";
import { prepareDocumentDefinition } from "../src/runtime/server/definition";
import type { MarkdownDocumentServiceOptions } from "../src/runtime/server/types";

type RuntimeConfig = ReturnType<Parameters<typeof registerMarkdownDocumentAiReady>[2]>;

const llmsConfig = (config?: RuntimeConfig) => config?.["nuxt-ai-ready"]?.llmsTxt || undefined;

/**
 * Creates a request with the URL and method observed by Nitro hooks.
 * @param path Request target, including an optional query.
 * @param method HTTP method.
 * @returns A minimal H3 request event.
 */
function request(path = "/llms.txt", method = "GET") {
  const event = createTestEvent();
  event.node.req.url = path;
  event.node.req.method = method;
  return event;
}

/**
 * Registers the adapter against real document validation and request-local configuration.
 * @param options Application base URL and raw prefix.
 * @param deduplication Optional runtime sitemap reader and custom section metadata.
 * @returns The request callback, configuration reader and observable source callbacks.
 */
function setup(
  options: MarkdownDocumentServiceOptions = {},
  deduplication?: Parameters<typeof registerMarkdownDocumentAiReady>[4]
) {
  const list = vi.fn(() => [
    { title: "Public article", description: "Article summary", path: "/articles/one" }
  ]);
  const fetch = vi.fn(() => "# Article body");
  const excludedList = vi.fn(() => [{ title: "Excluded", path: "/excluded" }]);
  const service = createMarkdownDocumentService(
    [
      prepareDocumentDefinition(
        {
          route: "/articles/:slug",
          llms: { title: "Articles", description: "Public articles" },
          fetch,
          transform: (body) => ({ frontmatter: {}, body }),
          list
        },
        "articles.ts"
      ),
      prepareDocumentDefinition(
        {
          route: "/",
          llms: { title: "Home", description: "Start here" },
          fetch,
          transform: (body) => ({ frontmatter: {}, body }),
          list: () => [{ title: "Home", path: "/" }]
        },
        "home.ts"
      ),
      prepareDocumentDefinition(
        {
          route: "/excluded",
          fetch,
          transform: (body) => ({ frontmatter: {}, body }),
          list: excludedList
        },
        "excluded.ts"
      )
    ],
    options
  );
  const hooks = {
    hook: vi.fn<(name: "request", callback: (event: H3Event) => Promise<void>) => void>()
  };
  const getConfig = vi.fn<(event: H3Event) => RuntimeConfig>(() => ({
    "nuxt-ai-ready": {
      llmsTxt: {
        sections: [{ title: "Existing", links: [{ title: "Support", href: "/support" }] }]
      }
    }
  }));
  registerMarkdownDocumentAiReady(hooks, service, getConfig, options, deduplication);
  const onRequest = hooks.hook.mock.calls[0]?.[1];
  if (!onRequest) throw new Error("Missing request hook");
  return { onRequest, getConfig, list, fetch, excludedList };
}

describe("AI Ready document discovery", () => {
  it.each([
    { options: {}, path: "/llms.txt", prefix: "" },
    { options: { rawPrefix: "/raw" }, path: "/llms.txt", prefix: "/raw" },
    { options: { baseURL: "/docs/" }, path: "/docs/llms.txt", prefix: "/docs" },
    {
      options: { baseURL: "/docs/", rawPrefix: "/raw" },
      path: "/docs/llms.txt?refresh=1",
      prefix: "/docs/raw"
    }
  ])(
    "preserves configured sections and maps public links for $path ($prefix)",
    async ({ options, path, prefix }) => {
      const { onRequest, getConfig, list, fetch, excludedList } = setup(options);
      const event = request(path);
      await onRequest(event);
      expect(getConfig).toHaveBeenCalledWith(event);
      expect(llmsConfig(getConfig.mock.results[0]?.value)?.sections).toEqual([
        { title: "Existing", links: [{ title: "Support", href: "/support" }] },
        {
          title: "Articles",
          description: "Public articles",
          links: [
            {
              title: "Public article",
              description: "Article summary",
              href: `${prefix}/articles/one.md`
            }
          ]
        },
        {
          title: "Home",
          description: "Start here",
          links: [{ title: "Home", href: `${prefix}/index.md` }]
        }
      ]);
      expect(list).toHaveBeenCalledWith({ event });
      expect(fetch).not.toHaveBeenCalled();
      expect(excludedList).not.toHaveBeenCalled();
    }
  );

  it("discovers missing pages from the selected sitemaps on each request", async () => {
    let standalone = "quick-scan";
    const fetchSitemapUrlGroups = vi.fn(
      async () =>
        new Map([
          [
            "pages",
            [
              { loc: "https://example.com/site/" },
              { loc: `https://example.com/site/${standalone}` },
              { loc: "https://external.com/site/external" }
            ]
          ],
          [
            "articles",
            [
              { loc: "https://example.com/site/articles/one/" },
              { loc: `https://example.com/site/${standalone}/` }
            ]
          ]
        ])
    );
    const { onRequest, getConfig } = setup(
      { baseURL: "/site/", rawPrefix: "/raw" },
      {
        title: "Overige pagina's",
        description: "Andere openbare pagina's.",
        fetchSitemapUrlGroups,
        getSiteUrl: () => "https://example.com"
      }
    );
    getConfig.mockImplementation(() => ({
      "nuxt-ai-ready": { llmsTxt: { pages: "sitemap", sitemaps: ["pages", "articles"] } }
    }));

    const first = request("/site/llms.txt");
    await onRequest(first);
    expect(fetchSitemapUrlGroups).toHaveBeenCalledWith(first, ["pages", "articles"]);
    const firstConfig = llmsConfig(getConfig.mock.results[0]?.value);
    expect(firstConfig?.pages).toBe(false);
    expect(firstConfig?.sections).toContainEqual({
      title: "Overige pagina's",
      description: "Andere openbare pagina's.",
      links: [{ title: "/quick-scan", href: "https://example.com/site/quick-scan" }]
    });
    expect(firstConfig?.sections?.[0]?.links?.[0]?.href).toBe("/site/raw/articles/one.md");

    standalone = "tips";
    await onRequest(request("/site/llms/_configured-1.txt"));
    expect(llmsConfig(getConfig.mock.results[1]?.value)?.sections?.at(-1)?.links).toEqual([
      { title: "/tips", href: "https://example.com/site/tips" }
    ]);
  });

  it.each([
    { path: "/about", method: "GET" },
    { path: "/llms-full.txt", method: "GET" },
    { path: "/llms.txt/child", method: "GET" },
    { path: "/llms.txt", method: "HEAD" },
    { path: "/llms.txt", method: "POST" }
  ])("leaves $method $path untouched", async ({ path, method }) => {
    const { onRequest, getConfig, list } = setup();
    await onRequest(request(path, method));
    expect(getConfig).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("does not claim unprefixed discovery when app.baseURL is configured", async () => {
    const { onRequest, getConfig, list } = setup({ baseURL: "/docs/" });
    await onRequest(request("/llms.txt"));
    expect(getConfig).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it.each([{}, { "nuxt-ai-ready": {} }])(
    "skips missing AI Ready configuration (%j)",
    async (config) => {
      const { onRequest, getConfig, list } = setup();
      getConfig.mockReturnValue(config);
      await onRequest(request());
      expect(list).not.toHaveBeenCalled();
      expect(config).not.toHaveProperty("nuxt-ai-ready.llmsTxt.sections");
    }
  );

  it("initializes missing sections", async () => {
    const { onRequest, getConfig } = setup();
    const config: RuntimeConfig = { "nuxt-ai-ready": { llmsTxt: {} } };
    getConfig.mockReturnValue(config);
    await onRequest(request());
    expect(llmsConfig(config)?.sections?.map(({ title }) => title)).toEqual(["Articles", "Home"]);
  });

  it("keeps opted-in section metadata when a listing is empty", async () => {
    const { onRequest, getConfig, list, fetch } = setup();
    list.mockReturnValue([]);
    await onRequest(request());
    expect(llmsConfig(getConfig.mock.results[0]?.value)?.sections).toContainEqual({
      title: "Articles",
      description: "Public articles",
      links: []
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps repeated requests isolated without accumulating sections", async () => {
    const { onRequest, getConfig, list } = setup();
    const first = request();
    const second = request();
    await Promise.all([onRequest(first), onRequest(second)]);
    const firstSections = llmsConfig(getConfig.mock.results[0]?.value)?.sections;
    const secondSections = llmsConfig(getConfig.mock.results[1]?.value)?.sections;
    expect(firstSections).toHaveLength(3);
    expect(secondSections).toEqual(firstSections);
    expect(secondSections).not.toBe(firstSections);
    expect(list).toHaveBeenCalledWith({ event: first });
    expect(list).toHaveBeenCalledWith({ event: second });
  });

  it("propagates sanitized listing failures without changing configured sections", async () => {
    const { onRequest, getConfig, list } = setup();
    list.mockImplementation(() => {
      throw new Error("PRIVATE_SOURCE_SECRET");
    });
    await expect(onRequest(request())).rejects.toThrow(
      "Markdown document list failed in articles.ts."
    );
    expect(llmsConfig(getConfig.mock.results[0]?.value)?.sections).toHaveLength(1);
  });

  it("rejects listing paths outside the owning definition", async () => {
    const { onRequest, list } = setup();
    list.mockReturnValue([{ title: "Unsafe", description: "", path: "/unowned" }]);
    await expect(onRequest(request())).rejects.toThrow(
      "Invalid or unowned listing path in articles.ts."
    );
  });
});
