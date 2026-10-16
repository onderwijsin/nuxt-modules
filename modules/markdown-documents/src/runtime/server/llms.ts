import type { H3Event } from "h3";
import type { createMarkdownDocumentService } from "./service";
import { serializeMarkdownDocument } from "./serialize";

/** Local structural contract for the optional nuxt-llms 0.2 runtime hooks. */
interface LlmsHooks {
  hook(
    name: "llms:generate",
    callback: (
      event: H3Event,
      options: {
        sections: {
          title: string;
          description?: string;
          links?: { title: string; description?: string; href: string }[];
        }[];
      }
    ) => Promise<void>
  ): unknown;
  hook(
    name: "llms:generate:full",
    callback: (event: H3Event, options: unknown, contents: string[]) => Promise<void>
  ): unknown;
}

/**
 * Registers the optional LLMS integration without global hook augmentation.
 * @param hooks Nitro runtime hooks provided by the generated plugin.
 * @param service Application-bound document service.
 */
export function registerMarkdownDocumentLlms(
  hooks: LlmsHooks,
  service: ReturnType<typeof createMarkdownDocumentService>
): void {
  hooks.hook("llms:generate", async (event, options) => {
    const sections = await service.listLlmsSections({ event });
    options.sections.push(
      ...sections.map((section) => ({
        ...section,
        links: section.links.map(({ title, description, href }) => ({ title, description, href }))
      }))
    );
  });
  hooks.hook("llms:generate:full", async (event, _options, contents) => {
    for (const section of await service.listLlmsSections({ event })) {
      const parts = [`## ${section.title}`, section.description];
      for (const link of section.links) {
        const document = await service.resolveMarkdownDocument(link.path, { event });
        if (document) parts.push(serializeMarkdownDocument(document));
      }
      contents.push(parts.join("\n\n"));
    }
  });
}
