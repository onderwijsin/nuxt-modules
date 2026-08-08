import { createError, defineEventHandler, getRouterParam } from "h3";
import { keyParamSchema, mountParamSchema } from "../../../../utils/schema";
import { useAllowedStorage } from "../../../../utils/storage-admin";

/**
 * Deletes one permitted storage item.
 * @param event - Current H3 request event.
 * @returns The deleted storage-item identifier.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const keyResult = keyParamSchema.safeParse({ key: getRouterParam(event, "key") ?? "" });
  if (!mountResult.success || !keyResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage delete request" });
  }

  const { storage } = useAllowedStorage(
    event,
    mountResult.data.mount,
    "delete",
    keyResult.data.key
  );
  await storage.removeItem(keyResult.data.key);

  return { data: { key: keyResult.data.key, deleted: true } };
});
