import { addServerImports, addServerPlugin, addServerTemplate, addTypeTemplate } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import {
  documentServiceUtilities,
  generateDocumentRegistry,
  generateDocumentServiceTypes
} from "./definitions";
import type { MarkdownDocumentServiceOptions } from "../runtime/server/types";

/**
 * Registers the Nitro-only definition and service imports, types, and Markdown delivery.
 * @param nuxt The consuming Nuxt application.
 * @param serverRuntimeDir Absolute path to the module's server runtime.
 * @param directory Absolute path to the application's document definitions.
 * @param delivery Validated raw prefix and response content type.
 * @returns The virtual registry module shared by the delivery and discovery plugins.
 */
export function registerDocuments(
  nuxt: Nuxt,
  serverRuntimeDir: string,
  directory: string,
  delivery: Pick<MarkdownDocumentServiceOptions, "rawPrefix" | "contentType">
): string {
  addServerImports({ name: "defineMarkdownDocument", from: `${serverRuntimeDir}/index` });

  // Generate the registry in Nitro so definition callbacks keep their normal server imports.
  const registry = addServerTemplate({
    filename: "#markdown-documents",
    getContents: () =>
      generateDocumentRegistry(directory, serverRuntimeDir, {
        baseURL: nuxt.options.app.baseURL,
        rawPrefix: delivery.rawPrefix,
        contentType: delivery.contentType
      })
  });
  addServerImports(documentServiceUtilities.map((name) => ({ name, from: registry.filename })));
  addTypeTemplate(
    { filename: "types/markdown-documents.d.ts", getContents: generateDocumentServiceTypes },
    { nuxt: false, nitro: true }
  );

  // Bind document handlers to their routes and retain Nitro's router for all other requests.
  const plugin = addServerTemplate({
    filename: `${nuxt.options.buildDir}/markdown-documents/plugin.mjs`,
    getContents:
      () => `import { registerMarkdownDocumentHandlers } from ${JSON.stringify(`${serverRuntimeDir}/http`)};
import { documents, configuration, resolveMarkdownDocument } from ${JSON.stringify(registry.filename)};
export default (app) => registerMarkdownDocumentHandlers(app.h3App, documents, resolveMarkdownDocument, configuration, app.router.handler);
`
  });
  addServerPlugin(plugin.filename);
  return registry.filename;
}
