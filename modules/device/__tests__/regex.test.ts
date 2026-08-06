import { describe, expect, it, vi } from "vitest";

import {
  REGEX_CRAWLER,
  REGEX_MOBILE_OR_TABLET1,
  REGEX_MOBILE_OR_TABLET2,
  REGEX_MOBILE1,
  REGEX_MOBILE2
} from "../src/runtime/app/utils/regex";

vi.mock("#build/templates/device/crawlers-regex.mjs", () => ({
  REGEX_CRAWLER: /googlebot/i
}));

describe("device regex exports", () => {
  it("matches crawler and mobile signatures", () => {
    expect(
      REGEX_CRAWLER.test("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")
    ).toBe(true);
    expect(REGEX_MOBILE1.test("Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)")).toBe(true);
    expect(REGEX_MOBILE2.test("1207")).toBe(true);
    expect(REGEX_MOBILE_OR_TABLET1.test("Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)")).toBe(
      true
    );
    expect(REGEX_MOBILE_OR_TABLET2.test("1207")).toBe(true);
  });
});
