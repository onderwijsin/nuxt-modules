<script setup lang="ts">
const { data: example, error } = await useFetch("/api/emails/rendering");
</script>

<template>
  <main class="space-y-8">
    <UPageHeader
      title="An email, as authored"
      description="A complete newsletter showing headings, inline formatting, images, links, buttons, columns, lists, quotes, code, reusable components and a conditional section."
    />
    <UAlert v-if="error" color="error" title="Could not load the sample newsletter" />
    <div v-else-if="example" class="mx-auto max-w-3xl">
      <EmailPreview :example="example" />
      <p class="mt-4 text-center text-xs text-muted">
        Fictional newsletter. Source colors are preserved; no color mapper is supplied.
      </p>
    </div>
  </main>
</template>
