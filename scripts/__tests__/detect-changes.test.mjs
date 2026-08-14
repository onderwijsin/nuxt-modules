import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { ciPolicy } from "../ci-policy.mjs";
import {
  addDependencies,
  addDependents,
  buildDependencyGraph,
  buildDependentGraph,
  classifyChanges,
  discoverPackages,
  getTestPaths,
  selectPhases
} from "../detect-changes.mjs";

const root = resolve(import.meta.dirname, "../..");

function workspacePackage(path, name, dependencies = {}, extra = {}) {
  return {
    directory: resolve(root, path),
    manifest: { name, dependencies, ...extra }
  };
}

function names(entries) {
  return new Set(entries.map((entry) => entry.manifest.name));
}

describe("CI policy", () => {
  it("declares a versioned, conservative policy contract", () => {
    expect(ciPolicy.version).toBeGreaterThan(0);
    expect(ciPolicy.diffEvents).toEqual(["pull_request", "merge_group"]);
    expect(ciPolicy.ignoredDirectories).toContain("docs");
    expect(ciPolicy.ignoredGithubPaths).toContain(".github/actions");
    expect(ciPolicy.rootExceptions).toContain("package.json");
    expect(ciPolicy.fullPathPatterns.length).toBeGreaterThan(0);
  });

  it("defines complete phase sets for every scope", () => {
    expect(selectPhases("light")).toEqual(new Set(["format", "lint"]));
    expect(selectPhases("focused")).toEqual(
      new Set(["format", "lint", "prepare", "typecheck", "test", "pack", "external_consumer"])
    );
    expect(selectPhases("full")).toContain("external_consumer");
  });
});

describe("change classification", () => {
  it("keeps a module-specific external consumer layer focused", () => {
    const packages = [workspacePackage("modules/cache", "@onderwijsin/nuxt-cache")];

    const result = classifyChanges(
      ["integration/external-consumer/fixture/consumer-layers/cache/nuxt.config.ts"],
      packages,
      "pull_request"
    );

    expect(result.scope).toBe("focused");
    expect(result.full).toBe(false);
    expect(result.direct).toEqual(new Set(["@onderwijsin/nuxt-cache"]));
  });

  it.each([
    "integration/external-consumer/run.mjs",
    "integration/external-consumer/profile.mjs",
    "integration/external-consumer/layer-registry.mjs",
    "integration/external-consumer/fixture/nuxt.config.ts",
    "integration/external-consumer/__tests__/external-consumer.test.mjs"
  ])("selects full scope for shared external consumer path %s", (file) => {
    const result = classifyChanges([file], [], "pull_request");

    expect(result.scope).toBe("full");
    expect(result.full).toBe(true);
    expect(result.reason).toContain("Full validation required");
  });

  it.each([
    ["documentation directory", "docs/ci.md"],
    ["markdown file", "README.md"],
    ["changeset", ".changeset/example.md"],
    ["agent metadata", ".agents/example.md"],
    ["GitHub local action", ".github/actions/example/action.yml"],
    ["Dependabot metadata", ".github/dependabot.yml"],
    ["ignored root file", "notes.txt"]
  ])("selects light scope for %s", (_description, file) => {
    const result = classifyChanges([file], [], "pull_request");

    expect(result).toMatchObject({ scope: "light", full: false, reason: expect.any(String) });
    expect(result.direct).toEqual(new Set());
  });

  it("selects light scope when all files are ignored, including mixed ignored categories", () => {
    const result = classifyChanges(
      ["docs/ci.md", ".changeset/example.md", ".github/actions/example/action.yml"],
      [],
      "pull_request"
    );

    expect(result.scope).toBe("light");
    expect(result.reason).toBe("Ignored paths only.");
  });

  it("selects focused scope for package files and never lets documentation hide source changes", () => {
    const packages = [workspacePackage("modules/example", "@test/example")];

    const result = classifyChanges(
      ["modules/example/src/module.ts", "README.md", "docs/ci.md"],
      packages,
      "pull_request"
    );

    expect(result.scope).toBe("focused");
    expect(result.full).toBe(false);
    expect(result.direct).toEqual(new Set(["@test/example"]));
  });

  it("adds a module playground for module-root changes but not for playground-only changes", () => {
    const packages = [
      workspacePackage("modules/example", "@test/example"),
      workspacePackage("modules/example/playground", "example-playground")
    ];

    expect(
      classifyChanges(["modules/example/src/module.ts"], packages, "pull_request").direct
    ).toEqual(new Set(["@test/example", "example-playground"]));
    expect(
      classifyChanges(["modules/example/playground/app.vue"], packages, "pull_request").direct
    ).toEqual(new Set(["example-playground"]));
  });

  it("matches the most specific package path first", () => {
    const packages = [
      workspacePackage("modules/example", "@test/example"),
      workspacePackage("modules/example/playground", "example-playground")
    ];

    expect(
      classifyChanges(["modules/example/playground/app.vue"], packages, "pull_request").direct
    ).toEqual(new Set(["example-playground"]));
  });

  it.each([
    ".github/workflows/ci.yml",
    "scripts/detect-changes.mjs",
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "tsconfig.json",
    "vitest.config.ts",
    "nuxt.config.ts",
    "oxlint.config.ts",
    "oxfmt.config.ts"
  ])("selects full scope for repository-wide path %s", (file) => {
    const result = classifyChanges([file], [], "pull_request");

    expect(result.scope).toBe("full");
    expect(result.full).toBe(true);
    expect(result.reason).toContain("Full validation required");
  });

  it("bypasses full-triggering paths and preserves focused package classification", () => {
    const packages = [workspacePackage("modules/example", "@test/example")];

    const result = classifyChanges(
      ["modules/example/src/module.ts", "pnpm-lock.yaml"],
      packages,
      "pull_request",
      true
    );

    expect(result).toMatchObject({
      scope: "focused",
      full: false,
      reason: "YOLO bypassed full-triggering paths; remaining paths were classified."
    });
    expect(result.direct).toEqual(new Set(["@test/example"]));
  });

  it("falls back to light when YOLO bypasses the only full-triggering path", () => {
    const result = classifyChanges(["pnpm-lock.yaml"], [], "pull_request", true);

    expect(result).toMatchObject({
      scope: "light",
      full: false,
      reason: "YOLO bypassed full-triggering paths; remaining paths were classified."
    });
  });

  it("does not bypass full validation for merge groups", () => {
    const result = classifyChanges(["pnpm-lock.yaml"], [], "merge_group", true);

    expect(result.scope).toBe("full");
    expect(result.full).toBe(true);
  });

  it("fails closed for unknown paths, empty diffs, missing diffs, and unsupported events", () => {
    for (const result of [
      classifyChanges(["unknown/file.txt"], [], "pull_request"),
      classifyChanges([], [], "pull_request"),
      classifyChanges(null, [], "pull_request"),
      classifyChanges(["modules/example/src/module.ts"], [], "workflow_dispatch")
    ]) {
      expect(result.scope).toBe("full");
      expect(result.full).toBe(true);
      expect(result.direct).toEqual(new Set());
    }
  });

  it("uses identical rules for pull-request and merge-group diffs", () => {
    const packages = [workspacePackage("modules/example", "@test/example")];
    const changed = ["modules/example/src/module.ts"];

    expect(classifyChanges(changed, packages, "merge_group")).toEqual(
      classifyChanges(changed, packages, "pull_request")
    );
  });
});

describe("workspace dependency graph", () => {
  const packages = [
    workspacePackage("packages/producer", "@test/producer"),
    workspacePackage(
      "modules/consumer",
      "@test/consumer",
      {
        "@test/producer": "workspace:*",
        "@test/dev-consumer": "workspace:*",
        "@external/not-workspace": "catalog:"
      },
      {
        devDependencies: { "@test/dev-consumer": "workspace:*" },
        optionalDependencies: { "@test/optional-consumer": "workspace:*" },
        peerDependencies: { "@test/peer-consumer": "workspace:*" }
      }
    ),
    workspacePackage("modules/playground", "@test/playground", {
      "@test/consumer": "workspace:*"
    }),
    workspacePackage("packages/dev-consumer", "@test/dev-consumer"),
    workspacePackage("packages/optional-consumer", "@test/optional-consumer"),
    workspacePackage("packages/peer-consumer", "@test/peer-consumer")
  ];

  it("discovers every workspace dependency field and ignores external dependencies", () => {
    const reverse = buildDependentGraph(packages);
    const forward = buildDependencyGraph(packages);

    expect(reverse.get("@test/producer")).toEqual(new Set(["@test/consumer"]));
    expect(reverse.get("@test/dev-consumer")).toEqual(new Set(["@test/consumer"]));
    expect(reverse.get("@external/not-workspace")).toBeUndefined();
    expect(forward.get("@test/consumer")).toEqual(
      new Set([
        "@test/producer",
        "@test/dev-consumer",
        "@test/optional-consumer",
        "@test/peer-consumer"
      ])
    );
  });

  it("discovers newly added dependencies without a manual package list", () => {
    const graph = buildDependentGraph([
      workspacePackage("packages/producer", "@test/producer"),
      workspacePackage("modules/new-consumer", "@test/new-consumer", {
        "@test/producer": "workspace:*"
      })
    ]);
    const selected = new Set(["@test/producer"]);

    addDependents(selected, graph);

    expect(selected).toEqual(new Set(["@test/producer", "@test/new-consumer"]));
  });

  it("walks transitive dependencies and dependents to a fixed point", () => {
    const reverse = buildDependentGraph(packages);
    const forward = buildDependencyGraph(packages);
    const dependents = new Set(["@test/producer"]);
    const dependencies = new Set(["@test/playground"]);

    expect(addDependents(dependents, reverse)).toContain("@test/playground");
    expect(addDependencies(dependencies, forward)).toContain("@test/producer");
  });

  it("does not duplicate preselected packages and terminates on cycles", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])],
      ["c", new Set()]
    ]);
    const selected = new Set(["a"]);

    expect(addDependencies(selected, graph)).toEqual(new Set(["b"]));
    expect(selected).toEqual(new Set(["a", "b"]));
    expect(addDependencies(selected, graph)).toEqual(new Set());
  });

  it("discovers the repository workspace packages from package manifests", () => {
    const discovered = discoverPackages();

    expect(names(discovered)).toContain("@onderwijsin/nuxt-module-utils");
    expect(names(discovered)).toContain("healthcheck-playground");
  });
});

describe("test path selection", () => {
  it("selects existing package tests and excludes playground packages", () => {
    const discovered = discoverPackages();
    const byName = new Map(discovered.map((entry) => [entry.manifest.name, entry]));
    const selected = ["@onderwijsin/nuxt-healthcheck", "healthcheck-playground"];

    expect(getTestPaths(selected, byName)).toEqual(["modules/healthcheck/__tests__"]);
  });

  it("ignores unknown packages and packages without test directories", () => {
    const packageByName = new Map([
      ["without-tests", workspacePackage("packages/producer", "without-tests")],
      ["missing", undefined]
    ]);

    expect(getTestPaths(["without-tests", "missing"], packageByName)).toEqual([]);
  });
});

describe("detector command integration", () => {
  it("publishes scope, safety, package, and preparation outputs plus a summary", () => {
    const directory = mkdtempSync(resolve(tmpdir(), "detect-changes-"));
    const output = resolve(directory, "output");
    const summary = resolve(directory, "summary");

    try {
      const stdout = execFileSync("node", ["scripts/detect-changes.mjs"], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          CHANGED_FILES: "modules/directus-sitemaps/src/module.ts",
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_OUTPUT: output,
          GITHUB_STEP_SUMMARY: summary
        }
      });
      const outputs = readFileSync(output, "utf8");
      const summaryText = readFileSync(summary, "utf8");

      expect(stdout).toContain("CI validation scope: FOCUSED");
      expect(stdout).toContain(
        "Enabled phases: format, lint, prepare, typecheck, test, pack, external_consumer"
      );
      expect(outputs).toContain("scope=focused");
      expect(outputs).toContain(
        'phases=["format","lint","prepare","typecheck","test","pack","external_consumer"]'
      );
      expect(outputs).toContain("phase_format=true");
      expect(outputs).toContain("phase_lint=true");
      expect(outputs).toContain("phase_prepare=true");
      expect(outputs).toContain("phase_typecheck=true");
      expect(outputs).toContain("phase_test=true");
      expect(outputs).toContain("phase_build=false");
      expect(outputs).toContain("phase_validate_packages=false");
      expect(outputs).toContain("phase_pack=true");
      expect(outputs).toContain("phase_external_consumer=true");
      expect(outputs).toContain("packages=@onderwijsin/nuxt-directus-sitemaps");
      expect(outputs).toContain("prepare_packages=");
      expect(summaryText).toContain("CI validation scope: focused");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("fails closed instead of crashing when git cannot resolve the diff", () => {
    const stdout = execFileSync("node", ["scripts/detect-changes.mjs"], {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CHANGED_FILES: "",
        GITHUB_BASE_SHA: "not-a-real-commit",
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_SHA: "HEAD"
      }
    });

    expect(stdout).toContain("CI validation scope: FULL");
    expect(stdout).toContain("No trustworthy event diff is available.");
  });
});
