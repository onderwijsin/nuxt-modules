import type { H3Event } from "h3";
import type { DocumentService } from "./service";
import { serializeMarkdownDocument } from "./serialize";

/** Shared discovery shape accepted by Nuxt LLMS and AI Ready. */
export interface LlmsSection {
  title: string;
  description?: string | string[];
  links?: { title: string; description?: string; href: string }[];
}

/** Local structural contract for the optional nuxt-llms 0.2 runtime hooks. */
interface LlmsHooks {
  hook(
    name: "llms:generate",
    callback: (
      event: H3Event,
      options: {
        sections: LlmsSection[];
      }
    ) => Promise<void>
  ): unknown;
  hook(
    name: "llms:generate:full",
    callback: (event: H3Event, options: unknown, contents: string[]) => Promise<void>
  ): unknown;
}

/**
 * Projects public discovery sections without exposing internal canonical paths.
 * @param sections Listed sections with canonical paths.
 * @returns Sections with public Markdown links.
 */
export function toPublicLlmsSections(
  sections: Awaited<ReturnType<DocumentService["listLlmsSections"]>>
): LlmsSection[] {
  return sections.map((section) => ({
    ...section,
    links: section.links.map(({ title, description, href }) => ({ title, description, href }))
  }));
}

/**
 * Registers the optional LLMS integration without global hook augmentation.
 * @param hooks Nitro runtime hooks provided by the generated plugin.
 * @param service Application-bound document service.
 */
export function registerMarkdownDocumentLlms(hooks: LlmsHooks, service: DocumentService): void {
  hooks.hook("llms:generate", async (event, options) => {
    options.sections.push(...toPublicLlmsSections(await service.listLlmsSections({ event })));
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
