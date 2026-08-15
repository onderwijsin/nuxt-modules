import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modulesDirectory = resolve(import.meta.dirname, "../../modules");

function findObjectAssignment(source, start) {
  const openingBrace = source.indexOf("{", start);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}" && --depth === 0) return source.slice(openingBrace, index + 1);
  }
  return source.slice(openingBrace);
}

describe("module option composition", () => {
  it("requires every module namespace write to preserve existing values", () => {
    const moduleDirectories = readdirSync(modulesDirectory, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory()
    );

    expect(moduleDirectories.length).toBeGreaterThan(0);

    for (const directory of moduleDirectories) {
      const source = readFileSync(join(modulesDirectory, directory.name, "src/module.ts"), "utf8");
      const assignments =
        /nuxt\.options\.(?:runtimeConfig(?:\.public)?\.[\w]+|routeRules\[[^\]]+\])\s*=\s*(?:\{|defu\()/gu;

      if (source.includes("nuxt.options.runtimeConfig")) {
        expect(source, `${directory.name} must use a composition pattern`).toMatch(
          /defu\(|\.\.\.nuxt\.options\.runtimeConfig|\.\.\.existing/gu
        );
      }

      for (const match of source.matchAll(assignments)) {
        const assignmentTarget = match[0].slice(0, match[0].indexOf(" ="));
        const existingValue = assignmentTarget.includes("routeRules")
          ? "nuxt.options.routeRules"
          : "nuxt.options.runtimeConfig";
        if (match[0].endsWith("defu(")) {
          const callEnd = source.indexOf(");", match.index);
          expect(
            source.slice(match.index, callEnd),
            `${directory.name} must pass the existing namespace to defu`
          ).toContain(existingValue);
          continue;
        }
        const objectLiteral = findObjectAssignment(source, match.index);
        expect(
          objectLiteral,
          `${directory.name} must spread an existing runtime-config value`
        ).toContain("...");
      }
    }
  });
});
