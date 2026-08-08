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
      },
      defaults: { font: "Public Sans", primary: "ocean" }
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

function defined<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected a value");
  return value;
}

describe("useThemeCustomizerStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    appConfig.ui.colors = { primary: "ocean", neutral: "gray" };
    runtimeConfig.public.themeCustomizer.defaults = { font: "Public Sans", primary: "ocean" };
    runtime.applyColor.mockClear();
    runtime.applyGroupColor.mockClear();
    runtime.readDefaultShade.mockClear();
    runtime.removeColorTokens.mockClear();
    runtime.removeGroup.mockClear();
    runtime.setActiveColor.mockClear();
  });

  it("creates normalized custom colors from a group's active palette", () => {
    const store = useThemeCustomizerStore();

    const color = defined(store.addColor("Café Blue", "primary"));

    expect(color.name).toBe("Cafe Blue");
    expect(color.token).toBe("custom-primary-cafe-blue");
    expect(Object.keys(color.shades)).toHaveLength(11);
    expect(runtime.applyColor).toHaveBeenCalledWith(color);
  });

  it("rejects a custom color whose token is already in use", () => {
    const store = useThemeCustomizerStore();
    const first = defined(store.addColor("Ocean", "primary"));
    const duplicate = store.addColor("Ocean", "primary");

    expect(first).toBeDefined();
    expect(duplicate).toBeUndefined();
    expect(store.colors).toHaveLength(1);
  });

  it("initializes the configured default font and palette", () => {
    runtimeConfig.public.themeCustomizer.defaults = { font: "Inter", primary: "ocean" };

    const store = useThemeCustomizerStore();

    expect(store.font).toBe("Inter");
    store.applyPersistedTheme();
    expect(runtime.setActiveColor).toHaveBeenCalledWith("primary", "ocean");
  });

  it("discards malformed persisted state before applying runtime theme values", () => {
    const store = useThemeCustomizerStore();
    Reflect.set(store, "colors", [{ id: "broken", name: null, token: "broken", shades: "oops" }]);
    Reflect.set(store, "font", { invalid: true });

    store.applyPersistedTheme();

    expect(store.colors).toEqual([]);
    expect(store.groups).toEqual([]);
    expect(store.font).toBe("Public Sans");
    expect(store.version).toBe(1);
    expect(runtime.applyColor).not.toHaveBeenCalled();
  });

  it("migrates legacy role-based persisted colors to groups", () => {
    const store = useThemeCustomizerStore();
    Reflect.set(store, "colors", [
      { id: "legacy", name: "Ocean", role: "primary", token: "legacy", shades: {} }
    ]);

    store.applyPersistedTheme();

    expect(store.colors[0]).toMatchObject({ group: "primary", token: "custom-primary-ocean" });
    expect(store.colors[0]).not.toHaveProperty("role");
    expect(runtime.applyColor).toHaveBeenCalledOnce();
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
    const color = defined(store.addColor("Ocean", "primary"));

    store.updateShade(color.id, 500, "#ABCDEF");
    store.updateShade(color.id, 600, "not-a-color");

    expect(color.shades[500]).toBe("#abcdef");
    expect(color.shades[600]).toBe("#abcdef");
    expect(runtime.applyColor).toHaveBeenCalledTimes(2);
  });

  it("renames custom colors while keeping their active selection", () => {
    const store = useThemeCustomizerStore();
    const color = defined(store.addColor("Ocean", "primary"));
    store.setActiveColor("primary", color.token);

    store.renameColor(color.id, "Sky Blue");

    expect(color.name).toBe("Sky Blue");
    expect(color.token).toBe("custom-primary-sky-blue");
    expect(store.activeColors.primary).toBe(color.token);
    expect(runtime.removeColorTokens).toHaveBeenCalledWith("custom-primary-ocean");
    expect(runtime.applyColor).toHaveBeenLastCalledWith(color);
    expect(runtime.setActiveColor).toHaveBeenLastCalledWith("primary", color.token);
  });

  it("rejects renaming a custom color to an existing token", () => {
    const store = useThemeCustomizerStore();
    const first = defined(store.addColor("Ocean", "primary"));
    const second = defined(store.addColor("Sky", "primary"));

    expect(store.renameColor(second.id, "Ocean")).toBe(false);
    expect(second.name).toBe("Sky");
    expect(second.token).not.toBe(first.token);
  });

  it("renames runtime groups and moves their custom colors", () => {
    const store = useThemeCustomizerStore();
    store.addGroup("Brand colors");
    const color = defined(store.addColor("Ocean", "brand-colors"));

    expect(store.renameGroup("brand-colors", "Branding")).toBe("branding");
    expect(store.groups).toEqual(["branding"]);
    expect(color.group).toBe("branding");
    expect(store.activeColors.branding).toBe("ocean");
    expect(runtime.removeGroup).toHaveBeenCalledWith("brand-colors");
  });

  it("removes active colors and runtime groups cleanly", () => {
    const store = useThemeCustomizerStore();
    const color = defined(store.addColor("Ocean", "primary"));
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
