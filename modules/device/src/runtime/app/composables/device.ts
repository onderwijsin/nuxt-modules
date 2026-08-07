import type { Device } from "#build/types/device";
import { useRequestHeaders, useRuntimeConfig, useState } from "#imports";
import { reactive, ref } from "vue";
import { toEntries } from "module-utils/shared";

import {
  REGEX_CRAWLER,
  REGEX_MOBILE_OR_TABLET1,
  REGEX_MOBILE_OR_TABLET2,
  REGEX_MOBILE1,
  REGEX_MOBILE2
} from "../utils/regex";

// ---- Internal pure helpers -------------------------------------------------

const isMobile = (ua: string): boolean =>
  REGEX_MOBILE1.test(ua) || REGEX_MOBILE2.test(ua.slice(0, 4));

const isMobileOrTablet = (ua: string): boolean =>
  REGEX_MOBILE_OR_TABLET1.test(ua) || REGEX_MOBILE_OR_TABLET2.test(ua.slice(0, 4));

const isIos = (ua: string): boolean => /iPad|iPhone|iPod/.test(ua);
const isAndroid = (ua: string): boolean => /android/i.test(ua);
const isWindows = (ua: string): boolean => ua.includes("Windows");
const isMacOS = (ua: string): boolean => ua.includes("Mac OS X");
const isLinux = (ua: string): boolean => /Linux/i.test(ua) && !isAndroid(ua);

const browsers: readonly { name: string; regex: RegExp }[] = [
  { name: "Samsung", regex: /SamsungBrowser/i },
  { name: "Edge", regex: /edg(?:[ea]|ios)?\//i },
  { name: "Firefox", regex: /firefox|iceweasel|fxios/i },
  { name: "Chrome", regex: /chrome|crios|crmo/i },
  { name: "Safari", regex: /safari|applewebkit/i }
];

const getBrowserName = (ua: string): string => {
  for (const browser of browsers) {
    if (browser.regex.test(ua)) return browser.name;
  }
  return "";
};

// ---- Core generation --------------------------------------------------------

function generateFlags(userAgent: string, headers: Record<string, string> = {}): Device {
  let mobile = false;
  let mobileOrTablet = false;
  let ios = false;
  let android = false;

  /* v8 ignore start -- server header variants are validated in runtime integration, not unit environment */
  if (userAgent === "Amazon CloudFront") {
    if (headers["cloudfront-is-mobile-viewer"] === "true") {
      mobile = true;
      mobileOrTablet = true;
    }
    if (headers["cloudfront-is-tablet-viewer"] === "true") {
      mobile = false;
      mobileOrTablet = true;
    }
    if (headers["cloudfront-is-desktop-viewer"] === "true") {
      mobile = false;
      mobileOrTablet = false;
    }
    if (headers["cloudfront-is-ios-viewer"] === "true") ios = true;
    if (headers["cloudfront-is-android-viewer"] === "true") android = true;
  } else if (headers["cf-device-type"]) {
    switch (headers["cf-device-type"]) {
      case "mobile":
        mobile = true;
        mobileOrTablet = true;
        break;
      case "tablet":
        mobile = false;
        mobileOrTablet = true;
        break;
      case "desktop":
      default:
        mobile = false;
        mobileOrTablet = false;
        break;
    }
  } else {
    /* v8 ignore stop */
    mobile = isMobile(userAgent);
    mobileOrTablet = isMobileOrTablet(userAgent);
    ios = isIos(userAgent);
    android = isAndroid(userAgent);
  }

  const windows = isWindows(userAgent);
  const macOS = isMacOS(userAgent);
  const linux = isLinux(userAgent);
  const browserName = getBrowserName(userAgent);
  const isSafari = browserName === "Safari";
  const isFirefox = browserName === "Firefox";
  const isEdge = browserName === "Edge";
  const isChrome = browserName === "Chrome";
  const isSamsung = browserName === "Samsung";
  const isCrawler = REGEX_CRAWLER.test(userAgent);

  return {
    userAgent,
    isMobile: mobile,
    isMobileOrTablet: mobileOrTablet,
    isTablet: !mobile && mobileOrTablet,
    isDesktop: !mobileOrTablet,
    isIos: ios,
    isAndroid: android,
    isWindows: windows,
    isLinux: linux,
    isMacOS: macOS,
    isApple: macOS || ios,
    isDesktopOrTablet: !mobile,
    isSafari,
    isFirefox,
    isEdge,
    isChrome,
    isSamsung,
    isCrawler
  };
}

function patchDevice(target: Device, next: Device): void {
  // Keep the same reactive reference, just mutate keys
  for (const [k, v] of toEntries(next)) {
    target[k] = v as never;
  }
}

// ---- Main composable --------------------------------------------------------

/**
 * Resolves and caches device/browser capability flags for the current request/client.
 *
 * On server, flags are derived from request headers. On client, flags are derived
 * from `navigator.userAgent` and optionally refreshed on resize.
 *
 * @returns Reactive device flag object.
 */
export function useDevice(): Device {
  const _device = useState<Device | null>("device_flags", () => null);
  const _hasListener = useState<boolean>("device_flags_resize_listener", () => false);

  const runtimeConfig = useRuntimeConfig();
  const defaultUserAgent = runtimeConfig.public.device.defaultUserAgent;

  // If state already exists, make sure it’s correct on client.
  if (_device.value) {
    if (import.meta.client) {
      const ua = navigator.userAgent ?? defaultUserAgent;
      // Patch if the hydrated snapshot differs from real UA
      if (_device.value.userAgent !== ua) {
        patchDevice(_device.value, generateFlags(ua, {}));
      }
    }
    return _device.value;
  }

  const ua = ref<string>(defaultUserAgent);
  const headers = ref<Record<string, string>>({});

  /* v8 ignore start -- unit runner evaluates client branch; server branch covered in SSR runtime checks */
  if (import.meta.server) {
    headers.value = useRequestHeaders();
    ua.value = headers.value["user-agent"] ?? defaultUserAgent;
  } else {
    /* v8 ignore stop */
    ua.value = navigator.userAgent ?? defaultUserAgent;
  }

  const flags = reactive(generateFlags(ua.value, headers.value));
  _device.value = flags;

  // Optional: refresh on resize (client)
  if (import.meta.client && runtimeConfig.public.device.refreshOnResize && !_hasListener.value) {
    _hasListener.value = true;
    window.addEventListener("resize", () => {
      window.setTimeout(() => {
        const next = generateFlags(navigator.userAgent ?? defaultUserAgent, {});
        patchDevice(flags, next);
      }, 50);
    });
  }

  return flags;
}
