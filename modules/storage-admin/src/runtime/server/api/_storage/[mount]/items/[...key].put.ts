import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { keyParamSchema, mountParamSchema, putItemBodySchema } from "../../../../utils/schema";
import { useAllowedStorage } from "../../../../utils/storage-admin";

/**
 * Creates or replaces one permitted storage item.
 * @param event - Current H3 request event.
 * @returns The updated storage-item identifier.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const keyResult = keyParamSchema.safeParse({ key: getRouterParam(event, "key") ?? "" });
  const bodyResult = putItemBodySchema.safeParse(await readBody(event));
  if (!mountResult.success || !keyResult.success || !bodyResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid storage upsert request" });
  }

  const { storage } = useAllowedStorage(event, mountResult.data.mount, "write", keyResult.data.key);
  await storage.setItem(keyResult.data.key, bodyResult.data.value);

  return { data: { key: keyResult.data.key, updated: true } };
});
