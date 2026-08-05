---
name: nuxt-theme-customizer
description: Configure and use @onderwijsin/nuxt-theme-customizer in a Nuxt UI application.
---

# Nuxt Theme Customizer

Use this skill when integrating `@onderwijsin/nuxt-theme-customizer` into a
Nuxt UI application.

## Requirements

When the module is enabled, configure at least one complete named palette under
`themeCustomizer.primary`. There is no default primary color. Every palette
must define the eleven Tailwind shades `50`, `100`, `200`, `300`, `400`, `500`,
`600`, `700`, `800`, `900`, and `950` as six-digit HEX values.

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

Add custom group names to `ui.theme.colors` so Nuxt UI component props accept
them in generated TypeScript types, for example `color="accent"`.

## Usage

Place `<ThemePicker />` in the application's navigation:

```vue
<UHeader>
  <template #right>
    <ThemePicker />
  </template>
</UHeader>
```

The module also provides `/thema` for palette inspection and editing. Its user
interface is Dutch. Configured palettes, custom colors, groups, and active
selections are persisted in browser `localStorage`, not cookies.

For destructive actions, use the auto-imported `useConfirmDialog()` composable
instead of `window.confirm()`:

```ts
const confirm = useConfirmDialog();

if (await confirm({ title: "Kleur verwijderen?", color: "error" })) {
  removeColor();
}
```

For generated palettes, the module provides
`GET /api/theme/palette?hex=%23abcdef`, which proxies ColorFYI. The response
contains a six-digit `hex` value and exactly eleven `{ level, hex }` shade
objects. Applications that use another palette service can replace the route;
configured and locally created palettes do not depend on it.
