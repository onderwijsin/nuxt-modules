import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const modulesDirectory = resolve(import.meta.dirname, "../../modules");

/**
 * Discovers publishable Nuxt module names from the repository module directories.
 *
 * The directory name is the canonical module name after the repository's
 * `@onderwijsin/nuxt-` package prefix. Keeping discovery filesystem-based means
 * a new module automatically enters the full consumer profile; its layer still
 * must be added separately to provide module options and sanity coverage.
 *
 * @returns {string[]} Public Nuxt module package names.
 */
function discoverConsumerModules() {
  return readdirSync(modulesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `@onderwijsin/nuxt-${entry.name}`)
    .sort();
}

export const consumerModules = Object.freeze(discoverConsumerModules());

/**
 * Converts a public module package name to its fixture layer directory name.
 *
 * @param {string} module - Public module package name.
 * @returns {string} Layer directory name.
 */
export function getLayerName(module) {
  return module.slice("@onderwijsin/nuxt-".length);
}
