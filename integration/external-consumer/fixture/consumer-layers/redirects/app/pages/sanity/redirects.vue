<script setup lang="ts">
import { useRedirectsStore } from "@onderwijsin/nuxt-redirects/runtime/store";

const layerName = "redirects";
const store = useRedirectsStore();
const sharesPinia = Object.hasOwn(useNuxtApp().$pinia.state.value, store.$id);
const { data } = await useFetch("/api/sanity/redirects");
</script>

<template>
  <p :data-sanity="layerName" :data-shared-pinia="sharesPinia">{{ data }}</p>
</template>
