<template>
  <PlaygroundAppShell>
    <template #actions>
      <div class="flex items-center gap-1">
        <UButton
          to="/"
          icon="i-lucide-layout-dashboard"
          label="Overview"
          color="neutral"
          variant="ghost"
        />
        <UButton
          to="/preview"
          icon="i-lucide-eye"
          label="Preview"
          color="neutral"
          variant="ghost"
        />
        <UButton
          to="/error"
          icon="i-lucide-triangle-alert"
          label="Errors"
          color="neutral"
          variant="ghost"
        />
      </div>
    </template>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </PlaygroundAppShell>
</template>
