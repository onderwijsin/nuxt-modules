# @onderwijsin/nuxt-device

Nuxt 4 module that exposes SSR-aware device, operating-system, browser, and crawler flags through
the auto-imported `useDevice` composable.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-device
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-device"]
});
```

## Configuration

Options are configured under `device`:

| Option             | Type      | Default         | Description                                                                       |
| ------------------ | --------- | --------------- | --------------------------------------------------------------------------------- |
| `enabled`          | `boolean` | `true`          | Disables module setup when `false`.                                               |
| `defaultUserAgent` | `string`  | Chrome on macOS | User agent used when no request header is available, such as during prerendering. |
| `refreshOnResize`  | `boolean` | `false`         | Recalculates client flags after a window resize.                                  |

## Use device flags

`useDevice()` is auto-imported by the module and returns a stable reactive object:

```vue
<script setup lang="ts">
const device = useDevice();
</script>

<template>
  <MobileNavigation v-if="device.isMobile" />
  <p v-else-if="device.isCrawler">Crawler request</p>
  <DesktopNavigation v-else />
</template>
```

The object includes `userAgent`, `isMobile`, `isMobileOrTablet`, `isTablet`, `isDesktop`,
`isDesktopOrTablet`, `isIos`, `isAndroid`, `isWindows`, `isLinux`, `isMacOS`, `isApple`, `isSafari`,
`isFirefox`, `isEdge`, `isChrome`, `isSamsung`, and `isCrawler`.

On the server, CloudFront and Cloudflare device headers take precedence over user-agent parsing. On
the client, the browser's `navigator.userAgent` is used after hydration.

## Compatibility and boundaries

- Requires Node.js 22 or newer and Nuxt 4.
- `useDevice` is the public runtime API; internal regexes and generated templates are not public
  imports.
- Detection is heuristic. Treat flags as presentation hints, not as an authorization or security
  boundary.

## Development

```sh
pnpm --filter device-playground dev
pnpm --filter device-playground typecheck
```
