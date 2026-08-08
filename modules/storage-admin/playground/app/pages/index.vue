<script setup lang="ts">
import { shallowRef } from "vue";

interface SeededRecord {
  mount: string;
  key: string;
}

const seededRecords = shallowRef<SeededRecord[]>([]);
const errorMessage = shallowRef<string | null>(null);
const isSeeding = shallowRef(false);

/** Requests a semi-random set of records from the playground-only seed endpoint. */
async function seedStorage(): Promise<void> {
  isSeeding.value = true;
  errorMessage.value = null;

  try {
    const response = await $fetch<{ data: { created: SeededRecord[] } }>("/api/seed-storage", {
      method: "POST"
    });
    seededRecords.value = response.data.created;
  } catch {
    errorMessage.value = "Unable to create sample storage records.";
  } finally {
    isSeeding.value = false;
  }
}
</script>

<template>
  <UContainer class="py-8">
    <UPageHeader
      title="Storage admin playground"
      description="Seed the configured cache and demo mounts, then inspect their entries in the storage browser."
    />

    <div class="mt-8 space-y-6">
      <UButton
        :loading="isSeeding"
        icon="i-lucide-dices"
        :label="isSeeding ? 'Creating records…' : 'Create sample storage records'"
        @click="seedStorage"
      />

      <UAlert
        v-if="errorMessage"
        color="error"
        icon="i-lucide-circle-alert"
        :description="errorMessage"
      />

      <UCard v-if="seededRecords.length">
        <template #header>
          <h2 class="font-semibold text-highlighted">Created records</h2>
        </template>
        <ul class="space-y-2">
          <li v-for="record in seededRecords" :key="`${record.mount}:${record.key}`">
            <code>{{ record.mount }}</code> / <code>{{ record.key }}</code>
          </li>
        </ul>
      </UCard>
    </div>
  </UContainer>
</template>
