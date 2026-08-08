<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2 font-semibold text-highlighted">
          <UIcon name="i-lucide-palette" class="size-5 text-primary" />
          Thema Studio
        </NuxtLink>
      </template>
      <template #right>
        <UColorModeButton aria-label="Schakel kleurmodus" />
        <ThemeCustomizerThemePicker />
      </template>
    </UHeader>

    <UContainer class="py-10">
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UContainer>
  </UApp>
</template>
