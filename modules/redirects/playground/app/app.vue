<template>
  <UApp>
    <UHeader title="Redirects playground" to="/">
      <template #right>
        <UColorModeButton />
        <UButton
          href="https://github.com/onderwijsin/nuxt-modules"
          target="_blank"
          color="neutral"
          variant="ghost"
          icon="i-lucide-github"
          aria-label="Open repository on GitHub"
        />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter :ui="{ top: 'py-0 lg:py-0', container: 'py-8 lg:py-8' }">
      <template #top>
        <USeparator />
      </template>
      <template #left>
        <span class="text-sm text-muted">@onderwijsin/nuxt-redirects</span>
      </template>
      <template #right>
        <div class="text-sm text-muted">
          Copyright © {{ new Date().getFullYear() }} -
          <NuxtLink class="underline" to="https://onderwijsin.nl">
            Stichting Onderwijs in
          </NuxtLink>
        </div>
      </template>
    </UFooter>
  </UApp>
</template>
