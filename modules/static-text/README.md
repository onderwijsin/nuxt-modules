# @onderwijsin/nuxt-static-text

Provide one static, type-safe text dictionary to a Nuxt 4 application. The module exposes an
auto-imported `useText` translator and a vuei18n-like `$t` helper without requiring application code
to import the dictionary.

The dictionary is resolved at build time and is available in both server and client contexts. This
module deliberately focuses on static application text: it does not provide locale switching,
pluralization, or ICU message syntax.

## Getting started

Install the module:

```sh
pnpm add @onderwijsin/nuxt-static-text
```

Register it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-static-text"]
});
```

The module looks for a default-exported dictionary at `assets/ui/content.ts`, relative to the
application's `app/` directory. This is Nuxt's `srcDir` in Nuxt 4, so the file is usually
`app/assets/ui/content.ts`. Do not include `app/` in the configured path.

```ts
export default {
  signup: {
    button: "Sign up",
    signedUpAs: "Signed up as {audience}"
  },
  account: {
    profile: {
      contact: {
        email: {
          label: "Email address for {name}"
        }
      }
    }
  }
} as const;
```

The `as const` assertion preserves message literals so TypeScript can infer which placeholders are
required.

Nested dictionaries can be as deep as needed:

```ts
useText("account.profile.contact.email.label", { name: "Ada" });
```

## Agent skill

Install the consumer-facing skill for this module with:

```sh
npx skills add onderwijsin/nuxt-modules --skill nuxt-static-text
```

## `useText` composable

`useText` is auto-imported after module registration. Keys use dotted paths and are checked against
the dictionary's leaf values:

```ts
const buttonText = useText("signup.button");
const audienceText = useText("signup.signedUpAs", {
  audience: "trainee"
});
```

The following calls are type errors when using the dictionary above:

```ts
useText("signup.missing");
useText("signup.signedUpAs");
```

Every placeholder must be supplied as a string or number. At runtime, unknown keys throw an error.
If a placeholder is missing at runtime, its `{name}` token is kept in the returned string rather
than silently removed.

## `$t` in Vue templates

The module registers a Nuxt plugin that provides the same translator as `$t`:

```vue
<template>
  <button>{{ $t("signup.button") }}</button>
  <p>{{ $t("signup.signedUpAs", { audience: "trainee" }) }}</p>
</template>
```

`$t` is also type-augmented on `NuxtApp` and Vue component instance properties, so the same key and
placeholder checks apply in templates.

`$t` is intentionally owned by this module and cannot be used concurrently with Vue I18n or Nuxt
I18n. If the application needs multiple languages, use Vue I18n instead.

## Configuration

Override the dictionary location under the `staticText` key:

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-static-text"],
  staticText: {
    content: "assets/content"
  }
});
```

The module is enabled by default. Set `staticText.enabled` to `false` to skip runtime registration.
`content` is optional and must be a relative path from `app/`. Both `assets/ui/content` and
`./assets/ui/content` are valid; the module removes the leading `./` before resolving the path.
Absolute paths, parent-directory paths, backslash-separated paths, spaces, brackets, and other
special characters are rejected. Each path segment may contain letters, numbers, `.`, `_`, and `-`.
The file should export one nested dictionary as its default export, and its extension can be
omitted.

## Design boundaries

This module is a build-time static dictionary integration. It does not:

- load text from an API or database;
- switch between locales;
- parse ICU messages or perform pluralization;
- sanitize or render HTML from dictionary values.

Keep rich text and untrusted content outside this translator. Use ordinary Vue rendering and the
application's trusted content pipeline when messages need markup or runtime data beyond simple
string/number placeholders.

## Troubleshooting

- **The dictionary cannot be found:** confirm `staticText.content` is relative to `app/` (Nuxt's
  `srcDir`) and points to a file with a default export. Do not prefix the configured path with
  `app/`.
- **Placeholders are not type-checked:** add `as const` to the dictionary export so message literals
  are preserved.
- **A key is rejected:** only dotted paths ending at string leaves are valid; intermediate objects
  cannot be translated directly.
- **Text is stale after changing the dictionary:** restart the Nuxt dev server or trigger a rebuild
  so the generated static-text runtime files are refreshed.
- **A placeholder remains visible:** the runtime call did not provide a value for that placeholder.
  Check the parameter name and value source.

## Compatibility

- Nuxt 4
- Node.js 24 or newer; Node.js 22 may work but is untested and unsupported

Developed and tested against Node.js 24 and Nuxt 4.5.x. Versions outside the current CI matrix are
not continuously tested. Nuxt 3 is not guaranteed.

## Extension and testing guidance

Keep the dictionary static and serializable. If changing the translator, preserve dotted-key lookup,
placeholder interpolation, SSR compatibility, and the `$t`/`useText` type contract. The package
includes focused translator and module setup tests plus a Nuxt playground for generated-file and
type-checking coverage.

## License

MIT
