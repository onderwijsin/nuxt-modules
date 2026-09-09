<script setup lang="ts">
const auth = useDirectusAuth();
const { user } = await useDirectusUser();
</script>

<template>
  <p data-testid="authenticated-user">{{ auth.userId ?? "unauthenticated" }}</p>
  <p data-testid="mapped-user-email">{{ user?.email ?? "no-user" }}</p>
</template>
