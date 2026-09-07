<template>
  <p data-testid="external-directus-auth-state">
    {{ isAuthenticated ? `authenticated:${userId}` : "unauthenticated" }}
  </p>
  <p data-testid="external-directus-user-mapper">
    {{ user?.displayName ?? "no-user" }}
  </p>
</template>

<script setup lang="ts">
const { isAuthenticated, userId } = useDirectusAuth();
const { user } = useDirectusUser();
</script>
