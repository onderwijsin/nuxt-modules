import { useStorage } from "nitropack/runtime";

export default defineEventHandler(async () => {
  await useStorage("directus-assets").setItem("foreign-key", "foreign-value");
  return { created: true };
});
