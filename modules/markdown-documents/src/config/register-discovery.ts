import {
  addServerPlugin,
  addServerTemplate,
  hasNuxtModule,
  hasNuxtModuleCompatibility
} from "@nuxt/kit";
import type { useLogger } from "@nuxt/kit";
import type { Nuxt } from "@nuxt/schema";
import type { LlmsSitemapDeduplication } from "./options.schema";

/**
 * Bridges the document service to Nuxt LLMS generation hooks.
 * @param pluginDirectory Absolute virtual plugin directory in Nuxt's build directory.
 * @param serverRuntimeDir Absolute path to the module's server runtime.
 * @param registry Virtual module providing the application-bound document service.
 */
function registerNuxtLlms(
  pluginDirectory: string,
  serverRuntimeDir: string,
  registry: string
): void {
  const plugin = addServerTemplate({
    filename: `${pluginDirectory}/llms.mjs`,
    getContents:
      () => `import { registerMarkdownDocumentLlms } from ${JSON.stringify(`${serverRuntimeDir}/llms`)};
import { service } from ${JSON.stringify(registry)};
export default (app) => registerMarkdownDocumentLlms(app.hooks, service);
`
  });
  addServerPlugin(plugin.filename);
}

/**
 * Bridges document listings and original Markdown to AI Ready's Nitro hooks.
 * @param pluginDirectory Absolute virtual plugin directory in Nuxt's build directory.
 * @param serverRuntimeDir Absolute path to the module's server runtime.
 * @param registry Virtual module providing the application-bound document service.
 * @param deduplication Section settings when the installed AI Ready reader is compatible.
 */
function registerAiReady(
  pluginDirectory: string,
  serverRuntimeDir: string,
  registry: string,
  deduplication: LlmsSitemapDeduplication | undefined
): void {
  // Import AI Ready's private sitemap reader only when the version-gated option is enabled.
  const sitemapSetup = deduplication
    ? `import { fetchSitemapUrlGroups } from "#ai-ready/server/utils/sitemap";
import { getSiteConfig } from "#site-config/server/composables/getSiteConfig";
const sitemapDeduplication = {
  ...${JSON.stringify(deduplication)},
  fetchSitemapUrlGroups,
  getSiteUrl: (event) => getSiteConfig(event).url
};`
    : "const sitemapDeduplication = undefined;";
  const plugin = addServerTemplate({
    filename: `${pluginDirectory}/ai-ready.mjs`,
    getContents: () => `import { defineNitroPlugin, useRuntimeConfig } from "#imports";
import { registerMarkdownDocumentAiReady } from ${JSON.stringify(`${serverRuntimeDir}/ai-ready`)};
import { registerMarkdownDocumentAiReadySource, registerMarkdownDocumentAiReadyMarkdown } from ${JSON.stringify(`${serverRuntimeDir}/ai-ready-content`)};
import { service, configuration } from ${JSON.stringify(registry)};
${sitemapSetup}
export default defineNitroPlugin((app) => {
  registerMarkdownDocumentAiReady(app.hooks, service, useRuntimeConfig, configuration, sitemapDeduplication);
  registerMarkdownDocumentAiReadySource(app.hooks, service, configuration);
  registerMarkdownDocumentAiReadyMarkdown(app.hooks, service);
});
`
  });
  addServerPlugin(plugin.filename);
}

/**
 * Registers discovery adapters after Nuxt installs the host's optional integrations.
 * @param nuxt The consuming Nuxt application.
 * @param serverRuntimeDir Absolute path to the module's server runtime.
 * @param registry Virtual module providing the application-bound document service.
 * @param deduplication Opt-in section settings for AI Ready sitemap entries.
 * @param log Module logger for unsupported opt-in configuration.
 */
export async function registerDiscovery(
  nuxt: Nuxt,
  serverRuntimeDir: string,
  registry: string,
  deduplication: LlmsSitemapDeduplication | undefined,
  log: Pick<ReturnType<typeof useLogger>, "warn">
): Promise<void> {
  const pluginDirectory = `${nuxt.options.buildDir}/markdown-documents`;
  if (hasNuxtModule("nuxt-llms", nuxt)) {
    registerNuxtLlms(pluginDirectory, serverRuntimeDir, registry);
  }

  const canDedupe =
    deduplication && (await hasNuxtModuleCompatibility("nuxt-ai-ready", "~3.6.1", nuxt));
  if (deduplication && !canDedupe) {
    log.warn("dedupeAiReadyLlmsSitemapEntries requires nuxt-ai-ready 3.6.1 or a later 3.6 patch.");
  }
  if (hasNuxtModule("nuxt-ai-ready", nuxt)) {
    registerAiReady(
      pluginDirectory,
      serverRuntimeDir,
      registry,
      canDedupe ? deduplication : undefined
    );
  }
}
