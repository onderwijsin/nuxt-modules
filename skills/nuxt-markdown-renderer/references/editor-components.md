# Custom components and editor metadata

## Discovery and overriding built-ins

Create Vue files directly under `app/components/<componentsDir>/`; the default is
`app/components/renderer/`. Nested files are not discovered. Nuxt determines their registered names
and supported file extensions; use those names in MDC and component sets. Components remain lazy
through Comark's manifest.

A consumer file named `MarkdownButton.vue`, `MarkdownCallout.vue`, or `MarkdownReference.vue`
replaces that built-in. `MarkdownReference` retains the public `Reference` node name.

## A complete custom component

Create `app/components/renderer/MarkdownHero.vue`:

```vue
<script setup lang="ts">
import { defineEditorComponentSchema } from "#imports";

defineEditorComponentSchema({
  label: "Hero",
  description: "A page introduction with optional artwork and links.",
  type: "block",
  properties: {
    actionTo: { input: "url" },
    image: { properties: { src: { input: "image" } } },
    actions: {
      items: {
        properties: {
          to: { input: { type: "url" } },
          icon: { input: { type: "icon", collections: ["lucide", "heroicons"] } }
        }
      }
    },
    legacyTone: { deprecated: "Use tone instead." }
  }
});

withDefaults(
  defineProps<{
    /** Main heading displayed above the Markdown content. */
    title: string;
    /** Horizontal alignment. */
    align?: "left" | "center";
    /** Primary action destination. */
    actionTo?: string;
    /** Optional artwork. */
    image?: { src: string; alt?: string };
    /** Additional links. */
    actions?: { label: string; to: string; icon?: string }[];
    /** Visual tone. */
    tone?: "quiet" | "strong";
    /** Legacy visual tone. */
    legacyTone?: string;
  }>(),
  { align: "left", tone: "quiet" }
);
</script>

<template>
  <section :class="align === 'center' ? 'text-center' : 'text-left'">
    <img v-if="image" :src="image.src" :alt="image.alt ?? ''" />
    <h2>{{ title }}</h2>
    <slot />
    <UButton v-if="actionTo" :to="actionTo" label="Learn more" />
    <UButton v-for="action in actions" :key="action.to" v-bind="action" />
  </section>
</template>
```

Then author content using the node name, not the editor label `Hero`:

```md
::MarkdownHero
---

title: Build with Markdown align: center actionTo: /docs image: src: /images/hero.jpg alt: Our team
actions:

- label: Contact to: /contact icon: i-lucide-mail

---

Editable **Markdown** in the default slot. ::
```

If rendering with a named set, add `MarkdownHero` to that set. Keep the macro argument statically
extractable; it is a compiler macro, not a runtime registration function. It returns `void` and is
imported from `#imports`.

## defineEditorComponentSchema API

The macro enriches inferred Vue component metadata. Let `defineProps`, `withDefaults`, literal
unions, slots, and JSDoc provide ordinary types, descriptions, defaults, and required state. Use
overrides for editor-specific information or inference gaps.

### Component fields

| Field         | Type                                           | Required | Purpose                                              |
| ------------- | ---------------------------------------------- | -------- | ---------------------------------------------------- |
| `label`       | `string`                                       | yes      | Human-facing editor label, independent of node name. |
| `type`        | `"block" \| "inline"`                          | yes      | Editor insertion behavior.                           |
| `description` | `string`                                       | no       | Component chooser help text.                         |
| `deprecated`  | `boolean \| string \| { text: string }`        | no       | Deprecation marker or migration guidance.            |
| `properties`  | Field-name map of recursive property overrides | no       | Enrich inferred props.                               |

### Recursive property fields

These fields apply both to top-level props and nested object/array fields.

| Field         | Type                                                       | Purpose                                                             |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- |
| `values`      | `string[]`                                                 | Explicit choices, useful when an imported union cannot be expanded. |
| `input`       | Special input below                                        | Editor control for an inferred string field.                        |
| `deprecated`  | `boolean \| string \| { text: string }`                    | Prop deprecation hint.                                              |
| `type`        | `"string" \| "number" \| "boolean" \| "object" \| "array"` | Explicit editor category.                                           |
| `description` | `string`                                                   | Override inferred help text.                                        |
| `default`     | Any value                                                  | Override inferred default without coercion.                         |
| `required`    | `boolean`                                                  | Override inferred required state.                                   |
| `properties`  | Recursive field-name map                                   | Overrides for object fields.                                        |
| `items`       | Recursive property override                                | Overrides for array items, including their object fields.           |

Use non-empty guidance text for deprecation. `true` marks deprecated without guidance; `false` emits
no deprecation tag. Both component-level and property-level deprecation are supported.

### Special input forms

| Input | Accepted syntax                             | Constraint                                                     |
| ----- | ------------------------------------------- | -------------------------------------------------------------- |
| URL   | `"url"` or `{ type: "url" }`                | Inferred string field; no extra options.                       |
| Image | `"image"` or `{ type: "image" }`            | Inferred string field; no extra options.                       |
| Icon  | `{ type: "icon", collections: ["lucide"] }` | Inferred string field; at least one non-empty collection name. |

There is no bare `"icon"` shorthand because collections are required. These controls emit a
`specialInputType` tag; icon options appear in its `config.collections`. Use the actual inferred
string field for an image URL, not its enclosing object.

### Choices, defaults, and complex fields

For a component with an imported tone type or opaque complex prop, the corresponding schema can
supply explicit editor information:

```ts
// Inside the renderer SFC, with matching declared Vue props.
defineEditorComponentSchema({
  label: "Feature list",
  type: "block",
  deprecated: { text: "Use MarkdownHero for new landing pages." },
  properties: {
    tone: {
      values: ["quiet", "strong"],
      description: "Visual emphasis.",
      default: "quiet",
      required: false
    },
    features: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", required: true },
          href: { input: "url" }
        }
      }
    }
  }
});
```

The URL input still requires an inferred string `href` field. An explicit editor `type` does not
make a non-string Vue prop compatible with a special input.

## Lower-level metadata escape hatch

The `extendComponentMeta` macro from `nuxt-component-meta` remains available for metadata outside
the convenience API. Prefer `defineEditorComponentSchema` for normal renderer authoring. Its
lower-level payload uses the `markdownRenderer` namespace, `nodeType`, `props`, and `tags`:

```vue
<script setup lang="ts">
import { extendComponentMeta } from "#imports";

extendComponentMeta({
  markdownRenderer: {
    label: "Notice",
    nodeType: "block",
    props: {
      destination: {
        tags: [{ name: "specialInputType", text: "url" }]
      }
    }
  }
});

defineProps<{ destination?: string }>();
</script>

<template>
  <UButton :to="destination" label="Continue" />
</template>
```

Do not mix the convenience macro's `properties`/`input` syntax with this normalized `props`/`tags`
syntax. Use one macro for a given renderer's metadata unless a concrete integration requires more.

## Directus metadata endpoint

Configure the Directus Markdown editor's metadata URL to the deployed Nuxt application's endpoint:

```text
https://website.example.com/api/markdown-renderer/components
https://website.example.com/api/markdown-renderer/components/article
```

The first returns all discovered editor components; the second returns only the configured set. The
response is a bare array, with no `{ components: ... }` wrapper. `Reference` is reserved for
Directus and deliberately excluded. Both `GET` and browser `OPTIONS` preflight are handled.

A representative component entry has this shape:

```json
[
  {
    "name": "MarkdownHero",
    "label": "Hero",
    "nodeType": "block",
    "props": {
      "title": { "name": "title", "type": "string", "required": true },
      "actionTo": {
        "name": "actionTo",
        "type": "string",
        "tags": [{ "name": "specialInputType", "text": "url" }]
      }
    },
    "slots": ["default"]
  }
]
```

Entries can also include `description` and `tags`; prop fields can include `values`, `description`,
`default`, `required`, `tags`, nested `properties`, and `items`. Inference supplies the complete
prop map, not just the fields overridden by the macro. Built-ins retain their typed prop metadata,
JSDoc, defaults, slots, and editor tags in installed applications.

The endpoint is public and has no authentication challenge. CORS is browser policy, not an access
control mechanism. Configure `corsOrigin` for the Directus origins that need to read it.

Invalid macro fields produce a build warning identifying the nested path, and that component's
editor overrides are ignored until corrected. A special input incompatible with an inferred prop
type causes the endpoint to report a validation error identifying the component and property path.
