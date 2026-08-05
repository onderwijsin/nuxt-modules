![Stichting Onderwijs in](https://raw.githubusercontent.com/onderwijsin/.github/main/banner.png)

# @onderwijsin/nuxt-theme-customizer

Runtime theme selection and custom color editing for Nuxt UI applications. The
module adds a `ThemePicker`, a complete `/thema` editor, generated Tailwind
color variables, and persisted browser state.

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

The module has no default primary color. When it is enabled, `primary` must
contain at least one named palette with all eleven shades: `50`, `100`, `200`,
`300`, `400`, `500`, `600`, `700`, `800`, `900`, and `950`.

Import the stylesheet after Tailwind and Nuxt UI:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-theme-customizer";
```

Nuxt module dependencies (`@nuxt/ui`, Pinia, persisted state, and VueUse) are
registered automatically. The package includes its runtime dependencies.

## Configuration

Every named group accepts one or more complete palettes. Built-in semantic
groups include `primary`, `secondary`, `success`, `info`, `warning`, `error`,
and `neutral`; arbitrary groups such as `accent` are also supported.

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

Add custom group names to `ui.theme.colors` when using them as typed Nuxt UI
component colors, for example `<UButton color="accent" />`.

The module includes Tailwind's neutral families `slate`, `gray`, `zinc`,
`neutral`, `stone`, `taupe`, `mauve`, and `mist`. These are available in the
picker without adding neutral palettes to module options.

The `enabled` option defaults to `nuxt.options.dev`, so production builds are
opted in explicitly:

| Option        | Default               | Description                                     |
| ------------- | --------------------- | ----------------------------------------------- |
| `enabled`     | `nuxt.options.dev`    | Registers the module when `true`.               |
| `primary`     | Required when enabled | Named palettes for the primary role.            |
| `secondary`   | —                     | Optional named palettes for the secondary role. |
| `neutral`     | —                     | Optional additional neutral palettes.           |
| Custom groups | —                     | Any additional named palette group.             |

## ThemePicker

`ThemePicker` is automatically registered as a component. Put it in the right
slot of a Nuxt UI header:

```vue
<UHeader>
  <template #right>
    <ThemePicker />
  </template>
</UHeader>
```

The picker can select configured palettes, generate a temporary palette from a
HEX value, change Nuxt UI's radius, and open the full theme editor. The module
UI is Dutch.

## Theme editor and generated palettes

The module registers `/thema`, which lets users inspect active shades, create
custom groups and colors, edit every shade, copy a complete `@theme` block,
and remove runtime customizations.

HEX palette generation calls the module-provided
`GET /api/theme/palette?hex=%23abcdef` endpoint, which proxies ColorFYI and
returns:

```ts
{
  hex: string;
  shades: Array<{ level: number; hex: string }>;
}
```

Applications that do not need generated palettes can disable or replace this
route in their Nuxt configuration; configured and locally created palettes
continue to work without it.

## Runtime behavior

Configured palettes are emitted as `--color-{name}-{shade}` variables. The
active palette for each group is mapped to `--color-{group}-{shade}` and Nuxt
UI semantic variables. Custom selections, groups, and active colors are
persisted in browser `localStorage` through the Pinia persisted-state plugin;
the module does not use cookies.

The following APIs are automatically imported:

- `ThemePicker`, `ColorPalette`, `ThemeCustomizer`, `HexInput`, and `RadiusInput`;
- `Confirmation`;
- `useGeneratedPalette()`;
- `useConfirmDialog()`;
- `useThemeCustomizerStore()`.

Use `useConfirmDialog()` for destructive actions that should match the module's
small Dutch confirmation modal:

```ts
const confirm = useConfirmDialog();

if (await confirm({ title: "Kleur verwijderen?", color: "error" })) {
  removeColor();
}
```

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
