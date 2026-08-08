import { createError, defineEventHandler, getRouterParam, readBody } from "h3";
import { clearMountBodySchema, mountParamSchema } from "../../../../utils/schema";
import { useAllowedStorage } from "../../../../utils/storage-admin";

/**
 * Clears every key in a mount that explicitly allows root-level administration.
 * @param event - Current H3 request event.
 * @returns The cleared storage mount.
 */
export default defineEventHandler(async (event) => {
  const mountResult = mountParamSchema.safeParse({ mount: getRouterParam(event, "mount") ?? "" });
  const bodyResult = clearMountBodySchema.safeParse(await readBody(event));
  if (!mountResult.success || !bodyResult.success) {
    throw createError({ statusCode: 400, statusMessage: "Invalid mount clear request" });
  }

  const { storage } = useAllowedStorage(event, mountResult.data.mount, "delete", "");
  await storage.clear();

  return { data: { mount: mountResult.data.mount, cleared: true } };
});
