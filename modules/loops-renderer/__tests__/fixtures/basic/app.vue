<template>
  <LoopsRenderer :data="data" :variables="variables" />
</template>

<script setup lang="ts">
const data = {
  type: "root",
  children: [
    {
      type: "element",
      name: "H1",
      attributes: {},
      children: [{ type: "text", value: "Welcome {contact.firstName}" }]
    },
    {
      type: "element",
      name: "Paragraph",
      attributes: {},
      children: [
        {
          type: "element",
          name: "Link",
          attributes: { href: "https://example.com/profile" },
          children: [{ type: "text", value: "View your profile" }]
        }
      ]
    }
  ]
} as const;

const variables = {
  contact: { firstName: "Ada" },
  data: {},
  event: {}
};
</script>
