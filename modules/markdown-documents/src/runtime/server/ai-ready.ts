import { getRequestURL } from "h3";
import type { H3Event } from "h3";
import { parseLocalPath } from "./paths";
import { listMarkdownDocumentLlmsSections } from "./llms";
import type { LlmsSection } from "./llms";
import type { createMarkdownDocumentService } from "./service";
import type { MarkdownDocumentServiceOptions } from "./types";

/** Local structural contract for Nitro's request hook. */
interface RequestHooks {
  hook(name: "request", callback: (event: H3Event) => Promise<void>): unknown;
}

/** Request-local configuration consumed by nuxt-ai-ready 2.5.3. */
interface AiReadyRuntimeConfig {
  "nuxt-ai-ready"?: {
    llmsTxt?: { sections?: LlmsSection[] };
  };
}

/**
 * Supplies document sections before AI Ready generates its llms.txt response.
 * @param hooks Nitro runtime hooks provided by the generated plugin.
 * @param service Application-bound document service.
 * @param getRuntimeConfig Reads Nitro's mutable configuration for this request only.
 * @param configuration Application base URL and document delivery settings.
 */
export function registerMarkdownDocumentAiReady(
  hooks: RequestHooks,
  service: ReturnType<typeof createMarkdownDocumentService>,
  getRuntimeConfig: (event: H3Event) => AiReadyRuntimeConfig,
  configuration: MarkdownDocumentServiceOptions = {}
): void {
  const baseURL = parseLocalPath(configuration.baseURL ?? "/").path;
  const llmsPath = `${baseURL === "/" ? "" : baseURL}/llms.txt`;

  hooks.hook("request", async (event) => {
    if (event.method !== "GET" || getRequestURL(event).pathname !== llmsPath) return;

    const config = getRuntimeConfig(event)["nuxt-ai-ready"]?.llmsTxt;
    if (!config) return;

    config.sections = [
      ...(config.sections ?? []),
      ...(await listMarkdownDocumentLlmsSections(service, event))
    ];
  });
}
