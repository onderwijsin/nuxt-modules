import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { deleteByPrefixBodySchema, mountParamSchema } from "../../../../utils/schema";
import { useAllowedStorage } from "../../../../utils/storage-admin";

/**
 * Clears all keys beneath one permitted prefix with the active storage driver's native clear method.
 * @param event - Current H3 request event.
 * @returns The cleared prefix.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const bodyResult = deleteByPrefixBodySchema.safeParse(await readBody(event));
  if (!mountResult.success || !bodyResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid prefix deletion request" });
  }

  const { storage } = useAllowedStorage(
    event,
    mountResult.data.mount,
    "delete",
    bodyResult.data.prefix
  );
  await storage.clear(bodyResult.data.prefix);
  return { data: { prefix: bodyResult.data.prefix, cleared: true } };
});
