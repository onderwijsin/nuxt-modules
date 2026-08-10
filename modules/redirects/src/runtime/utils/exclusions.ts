/** Redirect middleware exclusion configuration. */
export interface RedirectExclusions {
  excludedNamespaces: string[];
  excludedRoutes: string[];
}

/** Precomputed redirect exclusion lookup structures. */
export interface RedirectExclusionMatcher {
  namespaces: Set<string>;
  routes: Set<string>;
}

/**
 * Converts serialized runtime-config arrays into constant-time route lookups and iterable namespaces.
 *
 * @param config - Runtime redirect exclusion configuration.
 * @returns Reusable exclusion matcher.
 */
export function createRedirectExclusionMatcher(
  config: RedirectExclusions
): RedirectExclusionMatcher {
  return {
    namespaces: new Set(config.excludedNamespaces),
    routes: new Set(config.excludedRoutes)
  };
}

/**
 * Checks whether a path is excluded from redirect evaluation.
 *
 * @param path - Request or route path.
 * @param matcher - Precomputed exclusions.
 * @returns Whether redirect handling should be skipped.
 */
export function isRedirectExcluded(path: string, matcher: RedirectExclusionMatcher): boolean {
  if (matcher.routes.has(path)) return true;
  for (const namespace of matcher.namespaces) {
    if (path.startsWith(namespace)) return true;
  }
  return false;
}
