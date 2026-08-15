import { describe, expect, it } from "vitest";
import {
  containsPackageImport,
  discoverPrivateWorkspacePackages,
  discoverWorkspacePackages
} from "../package-validation.mjs";

describe("package validation discovery", () => {
  it("discovers every private workspace package instead of relying on a hardcoded name", () => {
    const packages = discoverWorkspacePackages();
    const privatePackages = discoverPrivateWorkspacePackages();

    expect(packages.some(({ manifest }) => manifest.name === "playground-layer")).toBe(true);
    expect(privatePackages).toContain("playground-layer");
    expect(privatePackages).toContain("test-utils");
  });

  it("detects package-root and subpath imports", () => {
    expect(containsPackageImport('import "playground-layer";', "playground-layer")).toBe(true);
    expect(containsPackageImport('from "test-utils/src"', "test-utils")).toBe(true);
    expect(containsPackageImport('from "test-utils-extra"', "test-utils")).toBe(false);
  });

  it("requires the supported Node.js 24 engine floor for published packages", () => {
    const publishedPackages = discoverWorkspacePackages().filter(
      ({ manifest }) => manifest.private !== true
    );

    expect(publishedPackages.every(({ manifest }) => manifest.engines?.node === ">=24")).toBe(true);
  });
});
