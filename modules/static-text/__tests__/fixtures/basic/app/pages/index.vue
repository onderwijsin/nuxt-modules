<script setup lang="ts">
const text = useText;
</script>

<template>
  <main>
    <p>{{ $t("actions.create") }}</p>
    <p>{{ text("welcome", { name: "Ada" }) }}</p>
  </main>
</template>
