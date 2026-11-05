import { createRequire } from "node:module";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { fetch, setupFixture } from "../../../packages/test-utils/src";

/**
 * Requests rendered HTML while surfacing server error details in failed assertions.
 * @param path - Playground route to render.
 * @returns SSR markup without scripts, so serialized payloads cannot satisfy content assertions.
 */
async function renderPage(path: string): Promise<string> {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const html = await response.text();
  expect(response.status, html).toBe(200);
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

describe("renderer playground pages", async () => {
  const requireVue = createRequire(createRequire(import.meta.url).resolve("vue"));
  const vuePackages = [
    "vue",
    "@vue/runtime-dom",
    "@vue/runtime-core",
    "@vue/reactivity",
    "@vue/shared",
    "@vue/server-renderer"
  ];
  // Match the markdown renderer fixture: use one Vue runtime throughout SSR.
  await setupFixture(import.meta.url, "../../playground", {
    nuxtConfig: {
      nitro: {
        alias: Object.fromEntries(
          vuePackages.map((name) => [name, dirname(requireVue.resolve(`${name}/package.json`))])
        ),
        externals: { inline: vuePackages }
      }
    }
  });

  it("renders the normal newsletter and links all three example pages", async () => {
    const html = await renderPage("/rendering");
    expect(html).toContain("Make room for your best work");
    expect(html).toContain("Hi Alex");
    expect(html).toContain("For our subscribers:");
    expect(html).toContain("{contact.firstName}");
    expect(html).toMatch(
      /<img[^>]+src="http:\/\/127\.0\.0\.1:\d+\/images\/northstar-notebook\.svg"/
    );
    for (const path of ["/rendering", "/color-mapping", "/approximation"]) {
      expect(html).toContain(`href="${path}"`);
    }
  });

  it("renders a full invitation with exact dark color mappings", async () => {
    const html = await renderPage("/color-mapping");
    expect(html).toContain("Good interfaces start with better questions");
    expect(html).toContain("A little preparation goes a long way");
    expect(html).toContain("background-color:var(--mail-tint)");
    expect(html).toContain("color:var(--mail-link)");
  });

  it("renders the same invitation twice with exact-only and approximate policies", async () => {
    const html = await renderPage("/approximation");
    expect(html).toContain("Without approximation");
    expect(html).toContain("With approximation");
    expect(html.match(/Good interfaces start with better questions/g)).toHaveLength(2);
    expect(html).toContain("background-color:#eef5ff");
    expect(html).toContain("background-color:var(--mail-tint)");
    expect(html).toContain("color:#2664ea");
    expect(html).toContain("color:var(--mail-link)");
  });
});
