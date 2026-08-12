import { readItems } from "@directus/sdk";

export default defineEventHandler(async (event) => {
  const pages = await useDirectusServer(readItems("pages", { fields: ["id"], limit: 1 }), event);

  return {
    count: pages.length,
    firstId: pages[0]?.id ?? null
  };
});
