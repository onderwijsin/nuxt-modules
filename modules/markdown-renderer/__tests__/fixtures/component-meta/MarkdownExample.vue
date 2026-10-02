<script setup>
defineEditorComponentSchema({
  label: "Example",
  type: "block",
  properties: { actions: { items: { properties: { to: { input: "url" } } } } }
});
defineProps({ actions: { type: Array, required: false } });
</script>

<template><div /></template>
