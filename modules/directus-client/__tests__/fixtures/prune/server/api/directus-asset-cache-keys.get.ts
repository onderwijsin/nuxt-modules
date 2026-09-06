import { useStorage } from "nitropack/runtime";

export default defineEventHandler(() => useStorage("directus-assets").getKeys());
