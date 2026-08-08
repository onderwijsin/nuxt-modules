import { z } from "zod";

const storageKeySchema = z.string().trim().min(1).max(512);

/** Validates a storage-mount route parameter. */
export const mountParamSchema = z.object({ mount: z.string().trim().min(1).max(128) });

/** Validates a catch-all storage-key route parameter. */
export const keyParamSchema = z.object({ key: storageKeySchema });

/** Validates a bounded key-list query. */
export const listQuerySchema = z.object({
  prefix: z.string().trim().max(512).optional().default(""),
  cursor: z.string().trim().min(1).max(512).optional(),
  limit: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  metadata: z.stringbool().optional().default(false),
  search: z.string().trim().max(512).optional()
});

/** Validates a storage value upsert request. */
export const putItemBodySchema = z.object({ value: z.json() });

/** Validates a confirmed prefix deletion request. */
export const deleteByPrefixBodySchema = z.object({
  prefix: storageKeySchema,
  confirm: z.literal(true)
});

/** Validates an explicit whole-mount clear request. */
export const clearMountBodySchema = z.object({ confirm: z.literal(true) });
