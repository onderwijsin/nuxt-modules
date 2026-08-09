![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# @onderwijsin/nuxt-theme-customizer

> Compatibility note: developed and tested against Node.js 24 and Nuxt 4.5.x. The package declares
> Node.js >=22 and may work with other Nuxt versions allowed by its package metadata, but versions
> outside the current CI matrix are not continuously tested; Nuxt 3 is not guaranteed.

Runtime theme selection and custom color editing for Nuxt UI applications. The module adds a
`ThemeCustomizerThemePicker`, a complete `/thema` editor, generated Tailwind color variables, and
persisted browser state.

## Installation

```sh
pnpm add @onderwijsin/nuxt-theme-customizer
```

Register the module and configure at least one primary palette:

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
    }
  }
});
```

The module has no default primary color. When it is enabled, `primary` must contain at least one
named palette with all eleven shades: `50`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`,
`900`, and `950`.

Import the stylesheet after Tailwind and Nuxt UI:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-theme-customizer";
```

Nuxt module dependencies (`@nuxt/ui`, Pinia, persisted state, and VueUse) are registered
automatically. The package includes its runtime dependencies.

## Configuration

Every named group accepts one or more complete palettes. Built-in semantic groups include `primary`,
`secondary`, `success`, `info`, `warning`, `error`, and `neutral`; arbitrary groups such as `accent`
are also supported.

```ts
export default defineNuxtConfig({
  ui: {
    theme: {
      colors: ["accent"]
    }
  },
  themeCustomizer: {
    primary: { ocean: oceanPalette },
    accent: { violet: violetPalette }
  }
});
```

Add custom group names to `ui.theme.colors` when using them as typed Nuxt UI component colors, for
example `<UButton color="accent" />`.

The module includes Tailwind's neutral families `slate`, `gray`, `zinc`, `neutral`, `stone`,
`taupe`, `mauve`, and `mist`. These are available in the picker without adding neutral palettes to
module options.

The `enabled` option defaults to `nuxt.options.dev`, so production builds are opted in explicitly:

| Option        | Default               | Description                                            |
| ------------- | --------------------- | ------------------------------------------------------ |
| `enabled`     | `nuxt.options.dev`    | Registers the module and its dependencies when `true`. |
| `primary`     | Required when enabled | Named palettes for the primary role.                   |
| `secondary`   | —                     | Optional named palettes for the secondary role.        |
| `neutral`     | —                     | Optional additional neutral palettes.                  |
| Custom groups | —                     | Any additional named palette group.                    |

Initial selections can be configured with `defaults`. A color-group default must name a palette from
that group; otherwise the first palette is used. When `googleFonts.families` is configured, its
first family is the default font unless `defaults.font` is set explicitly. `defaults.radius` is
measured in rem:

```ts
export default defineNuxtConfig({
  themeCustomizer: {
    primary: { ocean: oceanPalette, forest: forestPalette },
    accent: { violet: violetPalette },
    googleFonts: {
      families: ["Inter", "DM Sans"]
    },
    defaults: {
      primary: "forest",
      accent: "violet",
      font: "Inter",
      radius: 0.375
    }
  }
});
```

The default color keys are group names, so custom groups can be configured in the same way. Explicit
`appConfig.ui.colors` values take precedence over these initial color defaults. User selections
remain persisted in browser `localStorage`.

## ThemeCustomizerThemePicker

`ThemeCustomizerThemePicker` is automatically registered as a component. Put it in the right slot of
a Nuxt UI header:

```vue
<UHeader>
  <template #right>
    <ThemeCustomizerThemePicker />
  </template>
</UHeader>
```

The picker can select configured palettes, generate a temporary palette from a HEX value, change
Nuxt UI's radius, and open the full theme editor. The module UI is Dutch.

It also includes a searchable Font field. By default the module configures a curated set of 12
Google Fonts. To load the complete Google Fonts catalog, configure a server-side API key. The API
key is optional; you can instead provide the exact font families the consuming application should
offer:

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

The module proxies and filters Google Fonts metadata at `/api/_theme-customizer/fonts`, debouncing
SelectMenu queries. The selected family is persisted locally and loaded through Google Fonts CSS.
When `families` is provided without an API key, that list replaces the module's default family list.

### Acquiring a Google Fonts API key

The key is only needed when the full Google Fonts catalog is desired. It is used by the module's
server-side proxy and is never sent to the browser:

1. Select or create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the
   [Web Fonts Developer API](https://console.cloud.google.com/apis/library/webfonts.googleapis.com).
3. Open [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
4. Choose **Create credentials → API key**, then copy the generated key.
5. Restrict the key to the Web Fonts Developer API and store it in an environment variable:

```sh
GOOGLE_FONTS_API_KEY=your-key
```

The Google Fonts API documents the endpoint and API-key requirement in its
[Developer API guide](https://developers.google.com/fonts/docs/developer_api). Keep the key
server-side and do not commit it to source control.

## Theme editor and generated palettes

The module registers `/thema` by default, which lets users inspect active shades, create custom
groups and colors, edit every shade, copy a complete `@theme` block, and remove runtime
customizations.

Set `themeCustomizer.route` to another application-relative path to move the editor page. The route
name is always `theme-customizer`.

HEX palette generation calls the module-provided `GET /api/_theme-customizer/palette?hex=%23abcdef`
endpoint, which proxies ColorFYI and returns:

```ts
{
  hex: string;
  shades: Array<{ level: number; hex: string }>;
}
```

Applications that do not need generated palettes can disable or replace this route in their Nuxt
configuration; configured and locally created palettes continue to work without it.

Both public API endpoints are rate-limited by default: palette requests allow 30 per minute and font
searches allow 60 per minute, with a five-minute temporary ban. Configure them independently through
`themeCustomizer.rateLimit.palette` and `themeCustomizer.rateLimit.fonts`, or explicitly disable
them when equivalent CDN, WAF, or reverse-proxy protection is in place. ColorFYI responses are
runtime-validated, cached for 24 hours by normalized HEX value, and fetched with a five-second
timeout. Invalid or failed provider responses return the generic upstream error.

## Runtime behavior

Configured palettes are emitted as `--color-{name}-{shade}` variables. The active palette for each
group is mapped to `--color-{group}-{shade}` and Nuxt UI semantic variables. Custom selections,
groups, and active colors are persisted in browser `localStorage` through the Pinia persisted-state
plugin; the module does not use cookies.

The following components are automatically registered with the `ThemeCustomizer` prefix:

- `ThemeCustomizerThemePicker`, `ThemeCustomizerFontPicker`, `ThemeCustomizerColorPalette`,
  `ThemeCustomizerEditor`, `ThemeCustomizerHexInput`, and `ThemeCustomizerRadiusInput`;
- `ThemeCustomizerThemeCustomizerConfirmation` and `ThemeCustomizerFormModal`;
- `useGeneratedPalette()`;
- `useThemeCustomizerConfirmDialog()`;
- `useFormModal()`;
- `useThemeCustomizerStore()`.

## Agent skill

Install the consumer skill with:

```sh
npx skills add onderwijsin/nuxt-modules --skill nuxt-theme-customizer
```

## Compatibility

- Nuxt 4
- Nuxt UI 4
- Node.js 22 or newer

## License

MIT
