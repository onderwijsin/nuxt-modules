<script setup lang="ts">
const auth = useDirectusAuth();
</script>

<template>
  <p data-testid="authenticated-user">{{ auth.userId ?? "unauthenticated" }}</p>
</template>
