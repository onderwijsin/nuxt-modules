---
name: nuxt-ui-form-extensions
description:
  Use when building, reviewing, debugging, or extending forms with
  @onderwijsin/nuxt-ui-form-extensions in a Nuxt 4 application. It teaches agents how to install the
  module, use the auto-imported useDraftForm composable with Nuxt UI forms, preserve local edits
  while canonical state changes, handle dirty/submitting state, map validated submissions, and
  recover from failed saves.
---

# Nuxt UI Form Extensions

Build forms that keep a local editable draft separate from canonical application state. The module
currently provides one composable, `useDraftForm`, designed for Nuxt 4 + Nuxt UI forms.

## Install and register

```sh
pnpm add @onderwijsin/nuxt-ui-form-extensions
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@onderwijsin/nuxt-ui-form-extensions"]
});
```

The composable is auto-imported. The module registers `@nuxt/ui` as a Nuxt module dependency, but
the application still needs the normal Nuxt UI/Tailwind setup. It targets Nuxt 4 and Node.js 22+.

## The draft-form model

Use three distinct concepts:

- **Source:** canonical state returned by a store, route payload, or API query.
- **Draft:** the reactive local object bound to inputs.
- **Submission:** the validated payload sent to the save function; it may be the same shape as the
  draft or a separate DTO.

The composable deep-clones the source. Editing `state` therefore never mutates canonical state.
While the draft is clean, source changes replace the draft. Once the user edits locally, source
changes are deliberately ignored so a refresh cannot destroy unsaved work.

## Quick start with Nuxt UI

```vue
<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { shallowRef } from "vue";

interface Profile {
  displayName: string;
  email: string;
  notifications: boolean;
}

const source = shallowRef<Profile>({
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  notifications: true
});

const { state, saving, isDirty, submit } = useDraftForm<Profile, Profile>({
  getSource: () => source.value,
  save: async (submission) => {
    // Validate/map at this boundary, then persist it.
    source.value = submission;
  },
  onError: () => {
    // Keep the draft visible and show a toast/banner here.
  }
});

async function onSubmit(event: FormSubmitEvent<Profile>) {
  await submit(event.data);
}
</script>

<template>
  <UForm :state="state" @submit="onSubmit">
    <UFormField label="Display name" name="displayName">
      <UInput v-model="state.displayName" />
    </UFormField>
    <UFormField label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormField>
    <UCheckbox v-model="state.notifications" label="Receive notifications" />
    <UButton type="submit" :disabled="!isDirty" :loading="saving">Save</UButton>
  </UForm>
</template>
```

Do not call `save` directly from the button handler. Route successful and failed persistence through
`submit` so `saving`, the clean snapshot, and reset behavior stay consistent.

## Public API

### `useDraftForm<TDraft, TSubmission>(options)`

The composable is auto-imported; explicit import is also valid when the build exposes it.

```ts
interface UseDraftFormOptions<TDraft extends object, TSubmission> {
  getSource: () => TDraft;
  save: (submission: TSubmission) => Promise<void>;
  onError: () => void;
}

const {
  state, // reactive TDraft: bind with v-model
  saving, // Ref<boolean>: true during save
  isDirty, // ComputedRef<boolean>: draft differs from clean snapshot
  submit // (submission: TSubmission) => Promise<void>
} = useDraftForm<TDraft, TSubmission>(options);
```

| API         | Type                                         | Contract                                                                                                          |
| ----------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `getSource` | `() => TDraft`                               | Return the current canonical draft projection. Keep the function reactive by reading a ref/store value inside it. |
| `save`      | `(submission: TSubmission) => Promise<void>` | Persist a validated submission. Resolve on success; reject on failure.                                            |
| `onError`   | `() => void`                                 | Called after a rejected save. Use it for user feedback; the draft is retained.                                    |
| `state`     | `TDraft`                                     | Deep-cloned reactive draft for form bindings.                                                                     |
| `saving`    | `Ref<boolean>`                               | True from submit start until save success/failure handling completes.                                             |
| `isDirty`   | `ComputedRef<boolean>`                       | True when the draft differs from its clean snapshot, including nested plain objects.                              |
| `submit`    | `(submission: TSubmission) => Promise<void>` | Runs save, resets to the latest source on success, retains edits on failure.                                      |

## Submission and validation patterns

Keep UI state and API DTOs separate when their shapes differ:

```ts
interface UserDraft {
  firstName: string;
  lastName: string;
  email: string;
}
interface UpdateUserInput {
  name: string;
  email: string;
}

const form = useDraftForm<UserDraft, UpdateUserInput>({
  getSource: () => user.value,
  save: (input) => api.updateUser(input),
  onError: () => toast.add({ title: "Save failed", color: "error" })
});

await form.submit({
  name: `${form.state.firstName} ${form.state.lastName}`,
  email: form.state.email
});
```

Validate with the application’s form/schema boundary before `submit`; `useDraftForm` manages draft
lifecycle, not business validation or API error typing. `save` should reject for transport,
authorization, conflict, or server-validation failures.

## Synchronization semantics

| Situation                                      | Result                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Initial creation                               | `state` is a deep clone; `isDirty` is false.                             |
| User edits any nested plain object/array field | Canonical source is unchanged; `isDirty` becomes true.                   |
| Source changes while clean                     | Draft is replaced from the new source; remains clean.                    |
| Source changes while dirty                     | Local draft is preserved; `isDirty` remains true.                        |
| `submit` resolves without newer local edits    | Draft is replaced from the latest `getSource()` value and becomes clean. |
| User edits while `submit` is pending           | The newer local draft is preserved and remains dirty.                    |
| A second `submit` occurs while saving          | It is ignored; the in-flight save remains authoritative.                 |
| `submit` rejects                               | `onError` runs; draft and dirty state are preserved.                     |

This is intentionally not a conflict-resolution system. If a dirty draft must be discarded, change
the source lifecycle/key or expose an application-level reset that replaces the canonical input and
remounts the form. Do not mutate the internal clean snapshot.

## Data-shape and runtime constraints

- `TDraft` must be an object suitable for `structuredClone`; ordinary records, arrays, and `Date`
  values are supported.
- The implementation unwraps Vue proxies recursively before cloning.
- Dirty comparison is recursive for plain objects and does not depend on object key insertion order.
  Treat exotic class instances, functions, and non-plain custom prototypes as unsuitable draft
  state.
- Keep `getSource` stable and reactive: `getSource: () => store.profile` or `() => source.value`.
- Use `shallowRef`/store state for the canonical object when appropriate; never use the draft object
  as the source.
- Bind `saving` to the submit button for clear feedback. The composable also ignores concurrent
  submit calls, so an older operation cannot reset state after a newer one.

## Troubleshooting checklist

- **Inputs mutate the source:** verify `:state="state"` and `v-model="state.field"`; do not bind
  inputs to the source directly.
- **Source refresh overwrites edits:** verify the draft was not accidentally recreated on every
  render and that `getSource` returns the canonical state, not `state`.
- **Dirty state never changes:** check that edits are made through the reactive `state` and that the
  draft uses supported plain data.
- **Success leaves the form dirty:** ensure `save` resolves only after persistence and that
  `getSource()` returns the updated canonical value.
- **Failed save loses input:** do not replace the source or remount the form in `onError`; `submit`
  intentionally retains the draft.
- **Loading stays visible:** make sure `save` resolves or rejects and is not swallowing a promise;
  `saving` is reset after either outcome.

## Extension and testing guidance

For consumers, keep validation, toast UX, conflict policy, and API error mapping in the application.
For module changes, preserve the generic `TDraft`/`TSubmission` contract and test nested cloning,
clean-source synchronization, dirty-source preservation, successful reset, failed-save retention,
and `saving` cleanup.
