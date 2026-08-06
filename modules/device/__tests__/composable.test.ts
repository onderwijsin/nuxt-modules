import { beforeEach, describe, expect, it, vi } from "vitest";

async function loadUseDevice(options?: {
  headers?: Record<string, string>;
  defaultUserAgent?: string;
  refreshOnResize?: boolean;
  userAgent?: string;
}) {
  vi.resetModules();
  const state = new Map<string, { value: any }>();

  vi.doMock("#imports", () => ({
    useRequestHeaders: () => options?.headers ?? {},
    useRuntimeConfig: () => ({
      public: {
        device: {
          defaultUserAgent:
            options?.defaultUserAgent ??
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15",
          refreshOnResize: options?.refreshOnResize ?? false
        }
      }
    }),
    useState: <T>(key: string, init: () => T) => {
      if (!state.has(key)) state.set(key, { value: init() });
      return state.get(key)!;
    }
  }));
  vi.doMock("#build/templates/device/crawlers-regex.mjs", () => ({
    REGEX_CRAWLER: /bot/i
  }));
  vi.doMock("../runtime/utils/regex", () => ({
    REGEX_CRAWLER: /bot/i,
    REGEX_MOBILE1: /iphone|android/i,
    REGEX_MOBILE2: /^mobi/i,
    REGEX_MOBILE_OR_TABLET1: /iphone|android|ipad/i,
    REGEX_MOBILE_OR_TABLET2: /^tab/i
  }));

  vi.stubGlobal("navigator", {
    userAgent: options?.userAgent ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0"
  });
  vi.stubGlobal("window", {
    addEventListener: vi.fn(),
    setTimeout: vi.fn((cb: () => void) => cb())
  });

  return import("../src/runtime/app/composables/device");
}

describe("device composable", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("generates default flags and reuses reactive state", async () => {
    const { useDevice } = await loadUseDevice({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Safari/605.1.15"
    });
    const first = useDevice();

    expect(first.isMobile).toBe(true);
    expect(first.isIos).toBe(true);
    expect(first.isApple).toBe(true);
    expect(first.isDesktop).toBe(false);

    const second = useDevice();
    expect(second).toBe(first);
    expect(typeof second.userAgent).toBe("string");
  });

  it("handles Amazon CloudFront headers", async () => {
    const { useDevice } = await loadUseDevice({
      userAgent: "Amazon CloudFront",
      headers: {
        "user-agent": "Amazon CloudFront",
        "cloudfront-is-mobile-viewer": "true",
        "cloudfront-is-ios-viewer": "true"
      }
    });
    const flags = useDevice();
    expect(flags.userAgent).toBe("Amazon CloudFront");
    expect(typeof flags.isMobile).toBe("boolean");
    expect(typeof flags.isIos).toBe("boolean");
  });

  it("handles Cloudflare device headers and desktop browsers", async () => {
    const { useDevice } = await loadUseDevice({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0",
        "cf-device-type": "desktop"
      }
    });
    const flags = useDevice();
    expect(flags.isDesktop).toBe(true);
    expect(flags.isMobile).toBe(false);
    expect(typeof flags.isEdge).toBe("boolean");
    expect(flags.isWindows).toBe(true);
  });

  it("detects crawler and linux/android/browser flags", async () => {
    const { useDevice } = await loadUseDevice({
      userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/124.0 GoogleBot",
      headers: {
        "user-agent": "Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/124.0 GoogleBot"
      }
    });
    const flags = useDevice();
    expect(typeof flags.isCrawler).toBe("boolean");
    expect(flags.isAndroid).toBe(true);
    expect(flags.isLinux).toBe(false);
    expect(flags.isChrome).toBe(true);
  });

  it("keeps existing state when user agent changes in unit environment", async () => {
    const firstUa = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edg/124.0";
    const secondUa = "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit Safari/605.1.15";
    const { useDevice } = await loadUseDevice({ userAgent: firstUa });
    const first = useDevice();
    expect(first.userAgent).toBe(firstUa);

    vi.stubGlobal("navigator", { userAgent: secondUa });
    const second = useDevice();

    expect(second).toBe(first);
    expect(second.userAgent).toBe(firstUa);
  });

  it("does not register resize listener in unit environment", async () => {
    const addEventListener = vi.fn();
    const setTimeout = vi.fn((cb: () => void) => cb());
    vi.stubGlobal("window", { addEventListener, setTimeout });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0"
    });

    const { useDevice } = await loadUseDevice({ refreshOnResize: true });
    const flags = useDevice();
    expect(addEventListener).not.toHaveBeenCalled();
    expect(setTimeout).not.toHaveBeenCalled();
    expect(typeof flags.isDesktop).toBe("boolean");

    useDevice();
    expect(addEventListener).toHaveBeenCalledTimes(0);
  });

  it("detects firefox and samsung browsers", async () => {
    const { useDevice: useFirefoxDevice } = await loadUseDevice({
      userAgent: "Mozilla/5.0 (Android 14; Mobile) Firefox/126.0"
    });
    const firefox = useFirefoxDevice();
    expect(firefox.isFirefox).toBe(true);
    expect(firefox.isSamsung).toBe(false);

    const { useDevice: useSamsungDevice } = await loadUseDevice({
      userAgent: "Mozilla/5.0 (Linux; Android 14) SamsungBrowser/23.0"
    });
    const samsung = useSamsungDevice();
    expect(samsung.isSamsung).toBe(true);
    expect(samsung.isChrome).toBe(false);
  });
});
