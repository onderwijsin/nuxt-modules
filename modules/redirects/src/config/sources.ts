import { relative } from "node:path";
import { discoverSourceFiles } from "@onderwijsin/nuxt-module-utils/build";

export interface DiscoveredRedirectSource {
  name: string;
  path: string;
}

/**
 * Finds consumer redirect sources in deterministic path order.
 *
 * @param directory - Consumer `server/redirects` directory.
 * @returns Sources ordered so earlier paths take precedence during refresh.
 */
export function discoverRedirectSources(directory: string): DiscoveredRedirectSource[] {
  return discoverSourceFiles(directory).map((path) => ({ name: relative(directory, path), path }));
}

/**
 * Generates the single startup plugin that registers consumer redirect sources.
 *
 * @param sources - Discovered source files in first-wins precedence order.
 * @returns ESM source for a generated Nitro plugin.
 */
export function generateRedirectsSourceRegistry(sources: DiscoveredRedirectSource[]): string {
  const imports = sources
    .map((source, index) => `import source${index} from ${JSON.stringify(source.path)};`)
    .join("\n");
  const sourceEntries = sources.map((_, index) => `source${index}`).join(", ");

  return `${imports}

export default (nitroApp) => {
  nitroApp.hooks.hook("redirects:sources", (context) => {
    context.sources.push(${sourceEntries});
  });
};
`;
}
