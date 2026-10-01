<script setup lang="ts">
import { computed } from "vue";
import { useFetch } from "#imports";

const { data, error } = useFetch<{ data: { editor: string }[] }>(
  "http://localhost:8055/items/test?fields=editor&limit=1"
);

const fallback = `
Paragraph with **bold** and *italic* and ~~strike~~ and \`code\` and a [link](https://google.com).

# Heading 1

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

- Bullet list
- With nested items
- Second bullet

1. Numbered list
   1. With nested items
2. Second item

> Quote  
> With hard line break

A (self) reference: :Reference{collection="test" item="a0d458cb-639c-4ef1-905b-fc7fc38d17ae" label="a0d458cb-639c-4ef1-905b-fc7fc38d17ae" :data='{"id":"a0d458cb-639c-4ef1-905b-fc7fc38d17ae"}'}

![Alt text](/assets/4b4849c5-fdcf-4522-b090-adb9530ff526)

---

| Header 1 | Header 2 | Header 3 |
| -------- | -------- | -------- |
| Row 1A   | Row 1B   | Row 1C   |
| Row 2A   | Row 2B   | Row 2C   |

:MarkdownButton{label="A button" to="/contact" color="primary" variant="solid"} 

::MarkdownCallout{title="My callout" description="" color="info" icon="lucide:lightbulb"}
#description
Some very important information

::
`;

const value = computed(() => data.value?.data[0]?.editor ?? fallback);
</script>

<template>
  <UContainer class="py-10">
    <pre>{{ error }}</pre>
    <MarkdownRenderer component-set="demo" :value="value" />
  </UContainer>
</template>
