---
name: nuxt-static-text
description: Use when integrating or extending @onderwijsin/nuxt-static-text in a Nuxt 4 application. It teaches agents how to configure the static dictionary, use the typed useText composable and $t template helper, and preserve placeholder/key type safety.
---

# Nuxt Static Text

Use `@onderwijsin/nuxt-static-text` for one static, SSR-safe text dictionary. It is a typed lookup utility, not a locale system or ICU message formatter.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-static-text
```

```ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-static-text"]
});
```

By default, the module loads the dictionary from `assets/ui/content` relative to the application's `app/` directory (Nuxt's `srcDir`).

## Define the dictionary

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

Override the path with `staticText.content` when needed:

```ts
export default defineNuxtConfig({
  staticText: {
    content: "assets/ui/content"
  }
});
```

`content` may be `assets/ui/content` or `./assets/ui/content`; the leading
`./` is removed before resolution. Paths must stay relative to `app/` and use
letters, numbers, `.`, `_`, and `-` in each segment. Absolute paths, parent
directories, backslashes, spaces, and brackets are invalid.

## Use text

`useText` is auto-imported and supports dotted keys. Placeholders are required by TypeScript:

```ts
useText("signup.button");
useText("signup.signedUpAs", { audience: "trainee" });
useText("account.profile.contact.email.label", { name: "Ada" });
```

Templates can use the Vue-compatible `$t` helper:

```vue
<p>{{ $t("signup.signedUpAs", { audience: "trainee" }) }}</p>
```

Unknown keys throw at runtime. Missing placeholder values remain visible as `{name}` so incomplete content is not silently hidden.
