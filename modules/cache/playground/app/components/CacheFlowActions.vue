<script setup lang="ts">
defineProps<{
  isCreating: boolean;
  isInvalidating: boolean;
}>();

const emit = defineEmits<{
  create: [];
  invalidate: [];
}>();
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <UButton
      color="primary"
      :loading="isCreating"
      :disabled="isInvalidating"
      :label="isCreating ? 'Creating cache entry…' : 'Create cache entry'"
      @click="emit('create')"
    />
    <UButton
      color="neutral"
      variant="outline"
      :loading="isInvalidating"
      :disabled="isCreating"
      :label="isInvalidating ? 'Invalidating cache entry…' : 'Invalidate cache entry'"
      @click="emit('invalidate')"
    />
  </div>
</template>
