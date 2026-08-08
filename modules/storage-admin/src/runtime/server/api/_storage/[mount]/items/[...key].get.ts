import { createError, defineEventHandler, getRouterParam } from "h3";
import { keyParamSchema, mountParamSchema } from "../../../../utils/schema";
import { useAllowedStorage } from "../../../../utils/storage-admin";

/**
 * Returns one permitted storage item.
 * @param event - Current H3 request event.
 * @returns The requested storage item.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const keyResult = keyParamSchema.safeParse({ key: getRouterParam(event, "key") ?? "" });
  if (!mountResult.success || !keyResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage item request" });
  }

  const { storage } = useAllowedStorage(event, mountResult.data.mount, "read", keyResult.data.key);
  const value = await storage.getItem(keyResult.data.key);
  if (value === null)
    throw createError({ statusCode: 404, statusMessage: "Storage item was not found" });

  return { data: { key: keyResult.data.key, value } };
});
