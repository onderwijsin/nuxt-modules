---
"@onderwijsin/nuxt-markdown-renderer": minor
---

Add the `MarkdownAnchor` block component for invisible fragment targets, with editor metadata and a
configurable CSS scroll offset. Existing Markdown needs no content migration for this addition.

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

**Enable anchors in content**

If a field uses a named component set, add `MarkdownAnchor` to that set while retaining its existing
entries. Without a component set, the built-in component is already available:

```ts
export default defineNuxtConfig({
  markdownRenderer: {
    componentSets: { article: ["MarkdownButton", "MarkdownCallout", "MarkdownAnchor"] }
  }
});
```

Persist the node as `MarkdownAnchor`, with a required, unique string `id` and no slot content:

```mdc
[Jump to this section](#next-steps)

::MarkdownAnchor{id="next-steps"}
::
```

The target renders as an empty `span`. The module stylesheet gives it a default
`scroll-margin-top: 100px`; override `.markdown-anchor { scroll-margin-top: 64px; }` after the
module CSS if a different fixed-header offset is needed.

**Verify the upgrade**

Run `pnpm exec nuxt prepare`, your application's typecheck, and `pnpm exec nuxt build`. Check the
field's `/api/markdown-renderer/components/article` metadata endpoint for `MarkdownAnchor`, then
follow a fragment link on a rendered page and confirm its position below the header.
