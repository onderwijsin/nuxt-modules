---
name: nuxt-theme-customizer
description: Configure and use @onderwijsin/nuxt-theme-customizer in a Nuxt UI application.
---

# Nuxt Theme Customizer

Use this skill when integrating `@onderwijsin/nuxt-theme-customizer` into a Nuxt UI application.

## Requirements

When the module is enabled, configure at least one complete named palette under
`themeCustomizer.primary`. There is no default primary color. Every palette must define the eleven
Tailwind shades `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`, and `950` as
six-digit HEX values.

## Setup

```sh
pnpm add @onderwijsin/nuxt-theme-customizer
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-theme-customizer"],
  themeCustomizer: {
    enabled: true,
    primary: {
      ocean: {
        50: "#eff6ff",
        100: "#dbeafe",
        200: "#bfdbfe",
        300: "#93c5fd",
        400: "#60a5fa",
        500: "#3b82f6",
        600: "#2563eb",
        700: "#1d4ed8",
        800: "#1e40af",
        900: "#1e3a8a",
        950: "#172554"
      }
    },
    accent: {
      violet: violetPalette
    }
  },
  ui: {
    theme: {
      colors: ["accent"]
    }
  }
});
```

Import the module stylesheet after Tailwind and Nuxt UI:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-theme-customizer";
```

Add custom group names to `ui.theme.colors` so Nuxt UI component props accept them in generated
TypeScript types, for example `color="accent"`.

## Usage

Place `<ThemePicker />` in the application's navigation, or use the standalone `<FontPicker />` when
only font selection is needed:

```vue
<UHeader>
  <template #right>
    <ThemePicker />
  </template>
</UHeader>
```

`ThemePicker` includes a debounced, searchable font selector. Configure a Google Fonts Developer API
key when the complete catalog is needed. The key is optional; provide `families` to control the list
without using the API:

```ts
export default defineNuxtConfig({
  themeCustomizer: {
    googleFonts: {
      apiKey: process.env.GOOGLE_FONTS_API_KEY,
      families: ["Inter", "DM Sans", "Merriweather"]
    }
  }
});
```

Without an API key, the picker uses configured `families`; the module defaults this option to its
curated 12-font list.

Initial selections can be configured with `defaults`. The first configured Google Font family is
used when `defaults.font` is omitted. Color defaults use group names and must reference a palette
configured in that group; otherwise the first palette is used. `defaults.radius` is measured in rem:

```ts
export default defineNuxtConfig({
  themeCustomizer: {
    primary: { ocean: oceanPalette, forest: forestPalette },
    googleFonts: { families: ["Inter", "DM Sans"] },
    defaults: {
      primary: "forest",
      font: "Inter",
      radius: 0.375
    }
  }
});
```

### Acquiring a Google Fonts API key

The key is optional and is only required for the complete Google Fonts catalog. To create one:

1. Select or create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the
   [Web Fonts Developer API](https://console.cloud.google.com/apis/library/webfonts.googleapis.com).
3. Open [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
4. Choose **Create credentials → API key** and copy the generated key.
5. Restrict the key to the Web Fonts Developer API, then store it in an environment variable:

```sh
GOOGLE_FONTS_API_KEY=your-key
```

Pass the environment variable through `themeCustomizer.googleFonts.apiKey` as shown above. The
module uses it server-side; do not commit the key to source control. See Google's
[Web Fonts Developer API guide](https://developers.google.com/fonts/docs/developer_api) for the API
details.

The module also provides `/thema` for palette inspection and editing. Its user interface is Dutch.
Configured palettes, custom colors, groups, and active selections are persisted in browser
`localStorage`, not cookies.

The `/thema` editor also lets users rename custom colors and runtime-created groups through the edit
buttons beside their names.

For generated palettes, the module provides `GET /api/theme/palette?hex=%23abcdef`, which proxies
ColorFYI. The response contains a six-digit `hex` value and exactly eleven `{ level, hex }` shade
objects. Applications that use another palette service can replace the route; configured and locally
created palettes do not depend on it.
