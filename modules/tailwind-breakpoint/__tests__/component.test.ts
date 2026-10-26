import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

const useBreakpoints = vi.hoisted(() => vi.fn());
vi.mock("@vueuse/core", () => ({ useBreakpoints }));
vi.mock("@nuxt/ui/components/Badge.vue", () => ({
  default: defineComponent({
    props: { label: String },
    setup: (props) => () => h("span", props.label)
  })
}));

import TailwindBreakpoint from "../src/runtime/app/components/TailwindBreakpoint.client.vue";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("tailwind breakpoint badge", () => {
  it.each(["3xl", ""])(
    "renders the active breakpoint %s with its badge attributes",
    async (active) => {
      const values: Record<string, string> = {
        "--breakpoint-sm": " 40rem ",
        "--breakpoint-3xl": "120rem",
        "--breakpoint-empty": "  ",
        "--color-primary": "blue"
      };
      vi.stubGlobal("document", { documentElement: {} });
      vi.stubGlobal("getComputedStyle", () => ({
        *[Symbol.iterator]() {
          yield* Object.keys(values);
        },
        getPropertyValue: (key: string) => values[key] ?? ""
      }));
      useBreakpoints.mockReturnValue({ active: () => shallowRef(active) });

      const html = await renderToString(createSSRApp(TailwindBreakpoint));

      expect(useBreakpoints).toHaveBeenCalledExactlyOnceWith({ sm: "40rem", "3xl": "120rem" });
      expect(html).toContain(`>${active || "base"}</span>`);
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain("pointer-events:none");
      expect(html).toContain('icon="mdi:tailwind"');
    }
  );

  it("shows base when CSS exposes no breakpoints", async () => {
    vi.stubGlobal("document", { documentElement: {} });
    vi.stubGlobal("getComputedStyle", () => ({
      *[Symbol.iterator]() {},
      getPropertyValue: () => ""
    }));
    useBreakpoints.mockReturnValue({ active: () => shallowRef("") });
    const html = await renderToString(createSSRApp(TailwindBreakpoint));
    expect(useBreakpoints).toHaveBeenCalledWith({});
    expect(html).toContain(">base</span>");
  });
});
