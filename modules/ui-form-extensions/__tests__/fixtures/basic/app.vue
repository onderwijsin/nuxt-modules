<script setup lang="ts">
const source = { displayName: "Ada Lovelace" };
const { isDirty, state } = useDraftForm({
  getSource: () => source,
  save: async () => {},
  onError: () => {}
});
</script>

<template>
  <main>
    <p>{{ state.displayName }}</p>
    <p>{{ isDirty ? "dirty" : "clean" }}</p>
  </main>
</template>
