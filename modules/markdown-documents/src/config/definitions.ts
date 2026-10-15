import type { Nuxt } from "@nuxt/schema";
import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type {
  MarkdownDocumentService,
  MarkdownDocumentServiceOptions
} from "../runtime/server/types";
import { discoverSourceFiles } from "@onderwijsin/nuxt-module-utils/build";

export const documentServiceUtilities: (keyof MarkdownDocumentService)[] = [
  "resolveMarkdownDocument",
  "listMarkdownDocuments",
  "getMarkdownDocumentURL"
];

/**
 * Describes the generated service module using the public server utility signatures.
 * @returns Nitro-only module declarations for the emitted service utilities.
 */
export function generateDocumentServiceTypes(): string {
  const exports = documentServiceUtilities
    .map((name) => `  export const ${name}: Service["${name}"];`)
    .join("\n");
  return `declare module "#markdown-documents" {
  type Service = import("@onderwijsin/nuxt-markdown-documents/server").MarkdownDocumentService;
${exports}
}
`;
}

/**
 * Resolves the application-owned definition directory, without importing consumer code.
 * @param rootDir Application root, independent of srcDir and serverDir.
 * @param directory Validated relative directory.
 * @param explicitlyConfigured Whether the consumer explicitly configured dir.
 * @returns An absolute directory path, including an absent implicit default directory.
 */
export function resolveDefinitionDirectory(
  rootDir: string,
  directory: string,
  explicitlyConfigured: boolean
): string {
  const absolute = resolve(rootDir, directory);
  if (explicitlyConfigured && !existsSync(absolute)) {
    throw new Error(
      `Markdown document directory does not exist: ${absolute}. Create it or omit markdownDocuments.dir to use the optional default.`
    );
  }
  if (existsSync(absolute) && !statSync(absolute).isDirectory()) {
    throw new Error(`Markdown document path is not a directory: ${absolute}.`);
  }
  return absolute;
}

/**
 * Generates a server-only registry retaining each definition's inferred type.
 * @param directory Absolute consumer definition directory.
 * @param runtimeDirectory Absolute server runtime directory.
 * @param configuration Application base URL and validated document settings.
 * @returns ESM source with static imports, never serialized consumer callbacks.
 */
export function generateDocumentRegistry(
  directory: string,
  runtimeDirectory: string,
  configuration?: MarkdownDocumentServiceOptions
): string {
  const files = discoverSourceFiles(directory);
  const imports = files
    .map((file, index) => `import document${index} from ${JSON.stringify(file)};`)
    .join("\n");
  const entries = files
    .map((file, index) => `prepareDocumentDefinition(document${index}, ${JSON.stringify(file)})`)
    .join(",\n");
  return `import { prepareDocumentDefinition } from ${JSON.stringify(`${runtimeDirectory}/definition`)};
import { createMarkdownDocumentService } from ${JSON.stringify(`${runtimeDirectory}/service`)};
${imports}
export const configuration = ${JSON.stringify(configuration ?? {})};
export const documents = [
${entries}
];
export const {
  resolveMarkdownDocument,
  listMarkdownDocuments,
  getMarkdownDocumentURL
} = createMarkdownDocumentService(documents, configuration);
`;
}

/**
 * Checks whether an added or removed watched file belongs to the definition directory.
 * @param directory Absolute definition directory.
 * @param path Absolute watched path.
 * @param directoryEvent Whether the event adds or removes a directory.
 * @returns Whether registry membership may have changed.
 */
export function isDefinitionWatchPath(
  directory: string,
  path: string,
  directoryEvent = false
): boolean {
  const local = relative(directory, path);
  return (
    !isAbsolute(local) &&
    local !== ".." &&
    !local.startsWith(`..${sep}`) &&
    (directoryEvent || /\.(?:[cm]?[jt]s)$/u.test(local)) &&
    !/\.d\.[cm]?ts$/u.test(local)
  );
}

/**
 * Rebuilds Nitro when the set of document definition files changes.
 * @param nuxt The consuming Nuxt application.
 * @param directory Absolute definition directory to watch.
 */
export function watchDocumentDefinitions(nuxt: Nuxt, directory: string): void {
  nuxt.options.watch.push(directory);
  nuxt.hook("nitro:init", (nitro) => {
    nuxt.hook("builder:watch", async (event, path) => {
      const directoryChanged = event === "addDir" || event === "unlinkDir";
      const fileChanged = event === "add" || event === "unlink";
      if (!directoryChanged && !fileChanged) return;

      const absolutePath = resolve(nuxt.options.srcDir, path);
      if (!isDefinitionWatchPath(directory, absolutePath, directoryChanged)) return;

      await nitro.hooks.callHook("rollup:reload");
    });
  });
}
