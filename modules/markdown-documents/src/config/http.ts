import { addServerHandler, addServerTemplate } from "@nuxt/kit";
import type { useNitro } from "@nuxt/kit";
import type { Nuxt, NuxtPage } from "@nuxt/schema";
import type { ExistingDocumentRoute } from "../runtime/server/http";

/**
 * Flattens nested pages into absolute routes for collision checks.
 * @param pages Application pages.
 * @param parent Parent route for relative child paths.
 * @returns Page routes with their source files.
 */
function collectPageRoutes(pages: NuxtPage[], parent = ""): ExistingDocumentRoute[] {
  const routes: ExistingDocumentRoute[] = [];
  for (const page of pages) {
    const route = page.path.startsWith("/") ? page.path : `${parent}/${page.path}`;
    routes.push({ route, source: page.file ?? "application page" });
    routes.push(...collectPageRoutes(page.children ?? [], route));
  }
  return routes;
}

/**
 * Registers the compiled document handler without importing consumer definitions during setup.
 * @param nuxt Consuming application.
 * @param runtimeDirectory Absolute server runtime directory.
 */
export function registerDocumentDelivery(nuxt: Nuxt, runtimeDirectory: string): void {
  let pages: ExistingDocumentRoute[] = [];
  let nitro: ReturnType<typeof useNitro> | undefined;

  nuxt.hook("pages:extend", (entries) => {
    pages = collectPageRoutes(entries);
  });
  nuxt.hook("nitro:init", (instance) => {
    nitro = instance;
  });

  const handler = addServerTemplate({
    filename: "#markdown-documents-http",
    getContents() {
      const routes = [...pages];
      const handlers = [...(nitro?.scannedHandlers ?? []), ...(nitro?.options.handlers ?? [])];
      for (const handler of handlers) {
        if (handler.route && !handler.middleware) {
          routes.push({ route: handler.route, source: handler.handler });
        }
      }

      return `import { createMarkdownDocumentHandler } from ${JSON.stringify(`${runtimeDirectory}/http`)};
import { documents, configuration, resolveMarkdownDocument } from "#markdown-documents";

export default createMarkdownDocumentHandler(
  documents,
  resolveMarkdownDocument,
  configuration,
  ${JSON.stringify(routes)}
);
`;
    }
  });

  // Nitro 2 treats :slug.md as an unrestricted parameter. Match the suffix in
  // middleware so /articles/:slug remains available to the application's HTML routes.
  addServerHandler({ middleware: true, handler: handler.filename });
}
