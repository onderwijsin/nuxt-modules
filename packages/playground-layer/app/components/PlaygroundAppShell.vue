<script lang="ts" setup>
const app = useAppConfig();
const title = computed(() => app.packageName ?? "Nuxt playground");
</script>

<template>
  <UApp>
    <UHeader :title="title" to="/">
      <template #right>
        <slot name="actions" />
        <UButton v-for="action in app.header?.actions ?? []" v-bind="action" />
        <UColorModeButton v-if="app.header?.colorMode" />
        <UButton
          v-if="app.header?.github"
          :href="app.repo"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-lucide-github"
          aria-label="Open repository on GitHub"
        />
      </template>
    </UHeader>

    <UMain>
      <UContainer class="py-10 sm:py-14 space-y-16">
        <slot />
      </UContainer>
    </UMain>

    <UFooter :ui="{ top: 'py-0 lg:py-0', container: 'py-8 lg:py-8' }">
      <template #top>
        <USeparator />
      </template>
      <template #left>
        <span class="text-sm text-muted">{{ app.packageName }}</span>
      </template>
      <template #right>
        <div class="text-sm text-muted">
          Copyright © {{ new Date().getFullYear() }} -
          <NuxtLink class="underline" :to="app.publisherUrl">
            {{ app.publisher }}
          </NuxtLink>
        </div>
      </template>
    </UFooter>
  </UApp>
</template>
