import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const appConfig = {
  ui: {
    colors: {
      primary: "ocean",
      neutral: "gray"
    },
    radius: 0.25
  }
};
const runtimeConfig = {
  public: {
    themeCustomizer: {
      groups: {
        primary: ["ocean"],
        neutral: []
      }
    }
  }
};
const runtime = {
  applyColor: vi.fn(),
  applyGroupColor: vi.fn(),
  readDefaultShade: vi.fn(() => "#abcdef"),
  removeColorTokens: vi.fn(),
  removeGroup: vi.fn(),
  setActiveColor: vi.fn()
};

vi.mock("nuxt/app", () => ({
  useAppConfig: () => appConfig,
  useRuntimeConfig: () => runtimeConfig
}));
vi.mock("../src/runtime/app/adapters/theme-runtime.client", () => ({
  createThemeRuntimeAdapter: () => runtime
}));

import { useThemeCustomizerStore } from "../src/runtime/app/stores/theme-customizer";

describe("useThemeCustomizerStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    appConfig.ui.colors = { primary: "ocean", neutral: "gray" };
    runtime.applyColor.mockClear();
    runtime.applyGroupColor.mockClear();
    runtime.readDefaultShade.mockClear();
    runtime.removeColorTokens.mockClear();
    runtime.removeGroup.mockClear();
    runtime.setActiveColor.mockClear();
  });

  it("creates normalized custom colors from a group's active palette", () => {
    const store = useThemeCustomizerStore();

    const color = store.addColor("Café Blue", "primary");

    expect(color.name).toBe("Cafe Blue");
    expect(color.token).toBe("custom-primary-cafe-blue");
    expect(Object.keys(color.shades)).toHaveLength(11);
    expect(runtime.applyColor).toHaveBeenCalledWith(color);
  });

  it("sanitizes and activates runtime groups", () => {
    const store = useThemeCustomizerStore();

    expect(store.addGroup("Brand colors")).toBe("brand-colors");
    expect(store.groups).toEqual(["brand-colors"]);
    expect(store.isRuntimeGroup("brand-colors")).toBe(true);
    expect(runtime.setActiveColor).toHaveBeenCalledWith("brand-colors", "ocean");
  });

  it("updates valid shades and ignores invalid values", () => {
    const store = useThemeCustomizerStore();
    const color = store.addColor("Ocean", "primary");

    store.updateShade(color.id, 500, "#ABCDEF");
    store.updateShade(color.id, 600, "not-a-color");

    expect(color.shades[500]).toBe("#abcdef");
    expect(color.shades[600]).toBe("#abcdef");
    expect(runtime.applyColor).toHaveBeenCalledTimes(2);
  });

  it("removes active colors and runtime groups cleanly", () => {
    const store = useThemeCustomizerStore();
    const color = store.addColor("Ocean", "primary");
    store.setActiveColor("primary", color.token);

    store.removeColor(color.id);

    expect(store.colors).toHaveLength(0);
    expect(runtime.removeColorTokens).toHaveBeenCalledWith(color.token);
    expect(runtime.setActiveColor).toHaveBeenCalledWith("primary", "ocean");

    store.addGroup("Brand");
    expect(store.removeGroup("brand")).toBe(true);
    expect(store.removeGroup("missing")).toBe(false);
    expect(runtime.removeGroup).toHaveBeenCalledWith("brand");
  });
});
