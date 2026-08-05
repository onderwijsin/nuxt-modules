<script lang="ts" setup>
import type { LoopsLmxVariables } from "@onderwijsin/loops-core";
import { data } from "~/assets/ast";

const userId = useState("user-id", () => crypto.randomUUID());
const variables = computed<LoopsLmxVariables>(() => ({
  contact: {
    userId: userId.value,
    email: "email@example.com",
    firstName: "Jane",
    lastName: "Doe",
    subscribed: true,
    userGroup: "example-group"
  },
  data: {},
  event: {}
}));
</script>

<template>
  <main class="mx-auto max-w-3xl p-8">
    <UPageHeader
      title="Loops Renderer Playground"
      description="Example of the LoopsRenderer component with complex data"
    />
    <LoopsRenderer :data="data" :variables="variables" :config="{ debug: true }" />
  </main>
</template>
