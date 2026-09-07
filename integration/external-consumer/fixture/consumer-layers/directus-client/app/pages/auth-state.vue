<template>
  <p data-testid="external-directus-auth-state">
    {{ isAuthenticated ? `authenticated:${userId}` : "unauthenticated" }}
  </p>
</template>

<script setup lang="ts">
const { isAuthenticated, userId } = useDirectusAuth();
</script>
