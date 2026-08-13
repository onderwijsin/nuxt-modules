/**
 * Resolves the consumer profile from the packages present in a pack manifest.
 *
 * @param {{artifacts: Array<{name: string}>}} manifest - Packed artifact manifest.
 * @param {string[]} consumerModules - All modules known to the repository.
 * @returns {{packageNames: string[], modules: string[], full: boolean}} Consumer profile.
 */
export function resolveProfile(manifest, consumerModules) {
  const packageNames = new Set(manifest.artifacts.map((artifact) => artifact.name));
  const modules = consumerModules.filter((module) => packageNames.has(module));
  return {
    packageNames: [...packageNames].sort(),
    modules,
    full: modules.length === consumerModules.length
  };
}

/**
 * Converts manifest entries to exact local tarball dependencies.
 *
 * @param {{artifacts: Array<{name: string, filename: string}>}} manifest - Packed artifact manifest.
 * @param {string} packagesDirectory - Directory containing the packed artifacts.
 * @param {(directory: string, filename: string) => string} joinPath - Path joiner.
 * @returns {Record<string, string>} Package names mapped to local file dependencies.
 */
export function resolvePackedDependencies(manifest, packagesDirectory, joinPath) {
  return Object.fromEntries(
    manifest.artifacts.map((artifact) => [
      artifact.name,
      `file:${joinPath(packagesDirectory, artifact.filename)}`
    ])
  );
}

/**
 * Finds internal workspace dependencies that are absent from a packed artifact set.
 *
 * @param {{artifacts: Array<{name: string}>}} manifest - Packed artifact manifest.
 * @param {Array<{name: string, dependencies?: Record<string, string>, optionalDependencies?: Record<string, string>, peerDependencies?: Record<string, string>}>} packageManifests - Unpacked package metadata.
 * @returns {string[]} Missing internal package names with their requesting package.
 */
export function findMissingWorkspaceDependencies(manifest, packageManifests) {
  const packedNames = new Set(manifest.artifacts.map((artifact) => artifact.name));
  return packageManifests
    .flatMap((packageManifest) =>
      [
        packageManifest.dependencies ?? {},
        packageManifest.optionalDependencies ?? {},
        packageManifest.peerDependencies ?? {}
      ]
        .flatMap((dependencies) => Object.keys(dependencies))
        .filter(
          (dependency) =>
            dependency.startsWith("@onderwijsin/nuxt-") && !packedNames.has(dependency)
        )
        .map((dependency) => `${packageManifest.name} -> ${dependency}`)
    )
    .sort();
}
