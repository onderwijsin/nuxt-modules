<script setup lang="ts">
const device = useDevice();
</script>

<template>
  <main>
    <p id="user-agent">{{ device.userAgent }}</p>
    <p id="is-mobile">{{ device.isMobile }}</p>
    <p id="is-ios">{{ device.isIos }}</p>
    <p id="is-windows">{{ device.isWindows }}</p>
    <p id="is-chrome">{{ device.isChrome }}</p>
    <p id="is-desktop">{{ device.isDesktop }}</p>
  </main>
</template>
