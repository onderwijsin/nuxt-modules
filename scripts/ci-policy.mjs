/**
 * Repository-owned policy for classifying CI changes.
 *
 * Keep this value data-shaped so the detector remains the only policy engine and
 * future changes can be reviewed as a small, versioned contract.
 */
export const ciPolicy = Object.freeze({
  /** Increment when the detector/workflow contract changes incompatibly. */
  version: 4,
  /** Events whose payload provides a trustworthy base-to-head repository diff. */
  diffEvents: ["pull_request", "merge_group"],
  /** Repository directories whose contents cannot affect package validation. */
  ignoredDirectories: [
    ".agents",
    ".artifacts",
    ".changeset",
    ".codex",
    ".husky",
    ".vscode",
    "docs",
    "skills"
  ],
  /** GitHub metadata paths that are intentionally excluded from package validation. */
  ignoredGithubPaths: [".github/actions", ".github/dependabot.yml"],
  /** Root files allowed through ignored-path filtering for separate classification rules. */
  rootExceptions: [
    ".npmrc",
    ".nvmrc",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "vitest.config.ts",
    "nuxt.config.ts",
    "oxlint.config.ts",
    "oxfmt.config.ts"
  ],
  /** Path regular expressions that require full validation when matched. */
  fullPathPatterns: [
    "^\\.github/",
    "^scripts/",
    "^integration/",
    "^(?:package\\.json|pnpm-lock\\.yaml|pnpm-workspace\\.yaml)$",
    "^(?:tsconfig|vitest\\.config|nuxt\\.config|oxlint|oxfmt)[^.]*\\."
  ],
  /** Integration paths that can be validated against one affected module package. */
  focusedPackagePatterns: [
    {
      pattern: "^integration/external-consumer/fixture/consumer-layers/([^/]+)(?:/|$)",
      packagePrefix: "@onderwijsin/nuxt-"
    }
  ],
  /** Validation phases enabled for each overall scope. */
  phaseSets: {
    /** Documentation and ignored changes still verify repository formatting and lint. */
    light: ["format", "lint"],
    /** Package changes verify preparation, types, and tests without publishing artifacts. */
    focused: ["format", "lint", "prepare", "typecheck", "test", "pack", "external_consumer"],
    /** Full and fail-closed changes exercise every release-facing validation phase. */
    full: [
      "format",
      "lint",
      "prepare",
      "typecheck",
      "test",
      "build",
      "validate_packages",
      "pack",
      "external_consumer"
    ]
  }
});
