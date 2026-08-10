import { basename, extname, relative } from "node:path";
import { discoverSourceFiles } from "@onderwijsin/nuxt-module-utils/build";

const COMPONENT_NAME = /^[A-Za-z][A-Za-z0-9_-]*$/;
const RESERVED_COMPONENT_NAMES = new Set(["cache", "cloudinary", "directus"]);

interface DiscoveredComponent {
  name: string;
  path: string;
}

/**
 * Finds and validates consumer healthcheck component source files.
 *
 * @param directory - Consumer `server/healthcheck` directory.
 * @returns Components sorted by source path for deterministic builds.
 */
export function discoverHealthcheckComponents(directory: string): DiscoveredComponent[] {
  const components = discoverSourceFiles(directory).map((path) => ({
    name: basename(path, extname(path)),
    path
  }));

  const names = new Map<string, string>();
  for (const component of components) {
    if (!COMPONENT_NAME.test(component.name)) {
      throw new Error(
        `Invalid healthcheck component filename "${relative(directory, component.path)}". ` +
          "Use letters, numbers, hyphens, and underscores, starting with a letter."
      );
    }

    if (RESERVED_COMPONENT_NAMES.has(component.name)) {
      throw new Error(
        `Invalid healthcheck component name "${component.name}" in ${component.path}. ` +
          "Built-in component names cannot be overridden."
      );
    }

    const previousPath = names.get(component.name);
    if (previousPath) {
      throw new Error(
        `Duplicate healthcheck component name "${component.name}" found in ${previousPath} and ${component.path}.`
      );
    }
    names.set(component.name, component.path);
  }

  return components;
}

/**
 * Generates the virtual server-only health route handler.
 *
 * @param components - Validated consumer component files.
 * @param runtimeHealthPath - Absolute runtime health utility path.
 * @param runtimeEntry - Absolute runtime entry path.
 * @returns ESM source for the generated registry.
 */
export function generateHealthcheckComponentHandler(
  components: DiscoveredComponent[],
  runtimeHealthPath: string,
  runtimeEntry: string
): string {
  const imports = components
    .map((component, index) => `import component${index} from ${JSON.stringify(component.path)};`)
    .join("\n");
  const entries = components
    .map(
      (component, index) =>
        `  [${JSON.stringify(component.name)}, normalizeHealthcheckComponent(${JSON.stringify(component.name)}, component${index}, ${JSON.stringify(component.path)})]`
    )
    .join(",\n");

  return `import { defineEventHandler, setResponseStatus } from "h3";
import { getSystemHealth } from ${JSON.stringify(runtimeHealthPath)};
import { normalizeHealthcheckComponent } from ${JSON.stringify(runtimeEntry)};
${imports}

const customComponents = new Map([
${entries}
]);

export default defineEventHandler(async (event) => {
  const health = await getSystemHealth(event, customComponents);
  setResponseStatus(event, health.status === "error" ? 503 : 200);
  return { data: health };
});
`;
}
