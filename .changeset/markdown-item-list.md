---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Add `MarkdownItemList`, persisted in Markdown as `ItemList`, for ordered display rows with optional
dividers, images or icons, and links. Existing content needs no migration unless you choose to adopt
the new node.

**Upgrade and peer dependencies**

Use Node.js 24 or newer and Nuxt 4. Upgrade the renderer in the application:

```sh
pnpm add @onderwijsin/nuxt-markdown-renderer@0.3.0
```

Keep application-owned Vue `^3.5.0`, Nuxt UI `^4.0.0`, and `@comark/nuxt`, `@comark/vue`, and
`comark` `>=0.6.2`. Keep the three Comark packages on the same version. This feature adds no new
peers. If these dependencies are missing or incompatible, this is a compatible installation example;
retain existing compatible versions rather than replacing them unnecessarily:

```sh
pnpm add 'vue@^3.5.0' '@nuxt/ui@^4.0.0' \
  @comark/nuxt@0.7.0 @comark/vue@0.7.0 comark@0.7.0
```

Resolve unmet peer requirements and commit the updated application manifest and lockfile together.

Keep `@onderwijsin/nuxt-markdown-renderer` registered in `nuxt.config.ts`. Import its stylesheet
after Tailwind and Nuxt UI in the application's main CSS file:

```css
@import "tailwindcss";
@import "@nuxt/ui";
@import "@onderwijsin/nuxt-markdown-renderer";
```

If the application still sets `markdownRenderer.resolveReferencePath`, move that existing path to
`markdownRenderer.referenceConfig.linkResolver` before starting the upgraded application. The old
key is rejected. Keep the existing callback file, default export, and persisted `Reference` content.

**Enable and write item lists**

Add `ItemList` to each named component set used by the field, retaining existing entries. Use
`ItemList`, not the Vue implementation name `MarkdownItemList`, in both the allowlist and stored
Markdown. No allowlist entry is needed when `component-set` is omitted.

```mdc
::ItemList
---
divide: true
items:
  - title: Our services
    description: Explore how we can help.
    image: /images/services.jpg
    to: /services
  - title: Nuxt UI
    icon: i-lucide-external-link
    to: https://ui.nuxt.com
    external: true
---
::
```

`items` is required; all fields on an item are optional. `divide` defaults to `false`. An image
takes precedence over an icon. Omit `to` for an unlinked row; `external` only has an effect when
`to` is present and opens the destination in a new tab. The node has no content slots.

Refresh the Directus editor's configured renderer metadata URL after deploying. Nested image, URL,
and Lucide icon controls are supplied by the renderer metadata; no separate application plugin or
new editor node implementation is required for `ItemList`.

**Verify the upgrade**

Run `pnpm exec nuxt prepare`, your application's typecheck, and `pnpm exec nuxt build`. Confirm the
field's metadata includes `ItemList`, then check a rendered list with an internal link, an external
link, an image, and dividers.
