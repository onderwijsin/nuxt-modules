import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { fetch, setupFixture } from "../../../packages/test-utils/src";

const rpcResponse = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number(),
  result: z.unknown()
});
const toolResponse = z.object({
  isError: z.boolean().optional(),
  content: z.array(z.object({ type: z.literal("text"), text: z.string() }))
});

describe("AI Ready MCP document integration", async () => {
  const directory = await mkdtemp(join(tmpdir(), "markdown-documents-mcp-"));
  const aiReadyConfig = { aiReady: { database: { filename: join(directory, "pages.db") } } };
  await setupFixture(import.meta.url, "ai-ready", {
    dev: false,
    nuxtConfig: {
      modules: ["@nuxtjs/mcp-toolkit"],
      ...aiReadyConfig,
      nitro: {
        prerender: { routes: ["/articles/public", "/about"], crawlLinks: false, failOnError: true }
      }
    }
  });
  afterAll(() => rm(directory, { recursive: true, force: true }));

  it("lists, searches and reads original documents through the real MCP server", async () => {
    let requestId = 0;
    const headers = new Headers({
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    });

    /** Sends MCP JSON-RPC over Streamable HTTP, accepting JSON and SSE responses.
     * @param method MCP method name.
     * @param params Method parameters.
     * @returns Validated JSON-RPC result.
     */
    async function request(method: string, params: Record<string, unknown>) {
      const id = ++requestId;
      const response = await fetch("/mcp", {
        method: "POST",
        headers,
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
      });
      expect(response.status).toBe(200);
      const sessionId = response.headers.get("mcp-session-id");
      if (sessionId) headers.set("mcp-session-id", sessionId);
      const body = await response.text();
      const payload = response.headers.get("content-type")?.includes("text/event-stream")
        ? body
            .split(/\r?\n/)
            .find((line) => line.startsWith("data: "))
            ?.slice(6)
        : body;
      expect(payload).toBeTruthy();
      const message = rpcResponse.parse(JSON.parse(payload ?? "null"));
      expect(message.id).toBe(id);
      return message.result;
    }

    const initialization = await request("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "markdown-documents-e2e", version: "1.0.0" }
    });
    expect(initialization).toMatchObject({ capabilities: { tools: expect.any(Object) } });
    const notification = await fetch("/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })
    });
    expect(notification.status).toBe(202);

    const tools = await request("tools/list", {});
    expect(tools).toMatchObject({
      tools: expect.arrayContaining([
        expect.objectContaining({ name: "list_pages" }),
        expect.objectContaining({ name: "search_pages" }),
        expect.objectContaining({ name: "get_page_markdown" })
      ])
    });

    const listing = toolResponse.parse(
      await request("tools/call", { name: "list_pages", arguments: { limit: 50 } })
    );
    expect(listing.isError).not.toBe(true);
    expect(JSON.parse(listing.content[0]?.text ?? "null")).toMatchObject({
      pages: expect.arrayContaining([
        expect.objectContaining({
          route: "/articles/public",
          // The HTML fixture has no title/description metadata: document frontmatter
          // does not replace those index fields, so AI Ready falls back to the route.
          title: "/articles/public",
          description: ""
        })
      ]),
      total: 2
    });

    const search = toolResponse.parse(
      await request("tools/call", {
        name: "search_pages",
        arguments: { query: "SOURCE_MARKDOWN_BODY" }
      })
    );
    expect(search.isError).not.toBe(true);
    expect(JSON.parse(search.content[0]?.text ?? "null")).toEqual(
      expect.arrayContaining([expect.objectContaining({ route: "/articles/public" })])
    );

    const document = toolResponse.parse(
      await request("tools/call", {
        name: "get_page_markdown",
        arguments: { route: "/articles/public" }
      })
    );
    expect(document.isError).not.toBe(true);
    const markdown = document.content.map((item) => item.text).join("\n");
    expect(markdown).toContain("SOURCE_MARKDOWN_BODY");
    expect(markdown).toContain("author:");
    expect(markdown).toContain("readingMinutes: 6");
    expect(markdown).not.toContain("Canonical public article HTML");

    const missing = toolResponse.parse(
      await request("tools/call", {
        name: "get_page_markdown",
        arguments: { route: "/articles/draft" }
      })
    );
    expect(missing.isError).toBe(true);
  });
});
