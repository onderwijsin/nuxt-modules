---
name: nuxt-device
description:
  Use when integrating or extending @onderwijsin/nuxt-device in a Nuxt 4 application. It covers
  configuration and the SSR-aware useDevice composable.
---

# Nuxt Device

Use `@onderwijsin/nuxt-device` for request-aware device and browser classification in Nuxt 4. The
result is a reactive presentation helper, not a security boundary.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-device
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-device"]
});
```

Configure it under `device` when needed:

```ts
export default defineNuxtConfig({
  device: {
    defaultUserAgent: "Mozilla/5.0 (compatible; prerender)",
    refreshOnResize: true
  }
});
```

`enabled` defaults to `true`, `defaultUserAgent` is used when no request user agent exists, and
`refreshOnResize` defaults to `false`.

## Use the composable

```ts
const device = useDevice();
```

Available flags are `isMobile`, `isMobileOrTablet`, `isTablet`, `isDesktop`, `isDesktopOrTablet`,
`isIos`, `isAndroid`, `isWindows`, `isLinux`, `isMacOS`, `isApple`, `isSafari`, `isFirefox`,
`isEdge`, `isChrome`, `isSamsung`, and `isCrawler`. The original `userAgent` is also returned.

Server detection uses CloudFront and Cloudflare device headers where present, otherwise it parses
the request user agent. Client hydration uses `navigator.userAgent`.
