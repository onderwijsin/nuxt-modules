<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import { shallowRef } from "vue";

interface ProfileState {
  displayName: string;
  email: string;
  notifications: boolean;
}

const source = shallowRef<ProfileState>({
  displayName: "Ada Lovelace",
  email: "ada@example.com",
  notifications: true
});

const { state, saving, isDirty, submit } = useDraftForm<ProfileState, ProfileState>({
  getSource: () => source.value,
  save: async (submission) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    source.value = submission;
  },
  onError: () => {
    console.error("Unable to save profile preferences.");
  }
});

/** Saves the current form draft as the canonical profile state. */
async function save(event: FormSubmitEvent<ProfileState>): Promise<void> {
  await submit(event.data);
}
</script>

<template>
  <main class="mx-auto max-w-xl p-8">
    <h1 class="mb-2 text-3xl font-bold">Draft form playground</h1>
    <p class="mb-8 text-muted">Edit the form to see the dirty state and save the draft.</p>

    <UForm :state="state" @submit="save">
      <div class="space-y-5">
        <UFormField label="Display name" name="displayName">
          <UInput v-model="state.displayName" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" class="w-full" type="email" />
        </UFormField>

        <UFormField name="notifications">
          <UCheckbox v-model="state.notifications" label="Receive notifications" />
        </UFormField>

        <UButton v-if="isDirty" type="submit" :loading="saving"> Save changes </UButton>
      </div>
    </UForm>
  </main>
</template>
