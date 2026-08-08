<script setup lang="ts">
interface BaseOption {
  label: string;
  value: string;
}

interface MountOption {
  label: string;
  value: string;
}

const base = defineModel<string>("base", { required: true });
const mount = defineModel<string>("mount", { required: true });
const search = defineModel<string>("search", { required: true });

defineProps<{
  baseOptions: BaseOption[];
  mountOptions: MountOption[];
}>();
</script>

<template>
  <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <UInput
      v-model="search"
      aria-label="Search storage entries"
      class="w-full max-w-xl"
      icon="i-lucide-search"
      placeholder="Search key or cached path"
      size="xl"
    />
    <div class="flex w-full flex-col gap-4 md:w-auto md:flex-row">
      <USelect
        v-model="mount"
        aria-label="Storage mount"
        :items="mountOptions"
        class="w-full md:w-56"
        placeholder="Select a storage mount"
        size="xl"
      />
      <USelect
        v-model="base"
        aria-label="Cache base"
        :disabled="!mount"
        :items="baseOptions"
        class="w-full md:w-72"
        placeholder="All bases"
        size="xl"
      />
    </div>
  </div>
</template>
