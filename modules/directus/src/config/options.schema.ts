import { z } from "zod";

import { directusCommandSchema } from "./commands";

const localPath = z
  .string()
  .regex(/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/, "must be an absolute local path")
  .refine((value) => value !== "/", "must not be the root path")
  .refine(
    (value) => !value.split("/").some((segment) => segment === "." || segment === ".."),
    "must not contain traversal segments"
  );

const typeExpression = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n;]/.test(value), "must be a single TypeScript type expression");

const defaultTypegenOptions = {
  cache: { maxAge: 3_600_000 },
  augmentations: {
    removeEnums: false,
    replaceAnyWithUnknown: false,
    replaceJsonWithJSON: false,
    applyTypeNameOverrides: false,
    makeNonNullableOptionalsRequired: false,
    mergeJsDocs: false
  },
  rules: {}
};

const typegenSchema = z.object({
  introspectionToken: z.string().optional(),
  cache: z
    .object({ maxAge: z.number().int().nonnegative().default(3_600_000) })
    .default({ maxAge: 3_600_000 }),
  augmentations: z
    .object({
      removeEnums: z.boolean().default(false),
      replaceAnyWithUnknown: z.boolean().default(false),
      replaceJsonWithJSON: z.boolean().default(false),
      applyTypeNameOverrides: z.boolean().default(false),
      makeNonNullableOptionalsRequired: z.boolean().default(false),
      mergeJsDocs: z.boolean().default(false)
    })
    .default({
      removeEnums: false,
      replaceAnyWithUnknown: false,
      replaceJsonWithJSON: false,
      applyTypeNameOverrides: false,
      makeNonNullableOptionalsRequired: false,
      mergeJsDocs: false
    }),
  rules: z.record(z.string().min(1), z.record(z.string().min(1), typeExpression)).default({}),
  transform: z.function().optional()
});

/** Runtime boundary for the first Directus module stages. */
export const directusOptionsSchema = z
  .object({
    enabled: z.boolean().default(true),
    baseUrl: z.union([z.literal(""), z.url()]).default(""),
    staticToken: z.string().optional(),
    proxy: z
      .object({ path: localPath.default("/_directus/proxy") })
      .default({ path: "/_directus/proxy" }),
    commands: z.array(directusCommandSchema).default(["readItem", "readItems"]),
    auth: z.object({ enabled: z.boolean().default(false) }).default({ enabled: false }),
    typegen: typegenSchema.default(defaultTypegenOptions)
  })
  .superRefine((options, context) => {
    if (
      options.proxy.path === "/_directus/auth" ||
      options.proxy.path.startsWith("/_directus/auth/")
    ) {
      context.addIssue({
        code: "custom",
        path: ["proxy", "path"],
        message: "collides with the reserved /_directus/auth route prefix"
      });
    }
  });

export type DirectusOptionsSchema = typeof directusOptionsSchema;
