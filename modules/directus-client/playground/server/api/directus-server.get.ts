import { readItems } from "@directus/sdk";

export default defineEventHandler((event) =>
  useDirectusServer(readItems("articles", { fields: ["id"] }), event)
);
