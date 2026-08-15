import { describe, expect, it } from "vitest";
import { $fetch, setupFixture } from "../../../packages/test-utils/src";

const iphoneUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15";
const desktopUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36";

describe("device module", async () => {
  await setupFixture(import.meta.url);

  it("resolves device flags from the request user agent at runtime", async () => {
    const html = await $fetch("/", {
      headers: { "user-agent": iphoneUserAgent }
    });

    expect(html).toContain('<p id="user-agent">' + iphoneUserAgent + "</p>");
    expect(html).toContain('<p id="is-mobile">true</p>');
    expect(html).toContain('<p id="is-ios">true</p>');
    expect(html).toContain('<p id="is-desktop">false</p>');
  });

  it("resolves desktop flags from a desktop request user agent", async () => {
    const html = await $fetch("/", {
      headers: { "user-agent": desktopUserAgent }
    });

    expect(html).toContain('<p id="is-mobile">false</p>');
    expect(html).toContain('<p id="is-windows">true</p>');
    expect(html).toContain('<p id="is-chrome">true</p>');
    expect(html).toContain('<p id="is-desktop">true</p>');
  });
});
