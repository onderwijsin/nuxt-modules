import {
  directusClientSchema,
  directusConfigSchema,
  directusInstanceSchema
} from "@onderwijsin/nuxt-directus-config/schema";
import { enabled } from "@onderwijsin/nuxt-module-utils/build";
import { z } from "zod";

/** Runtime boundary for Directus client module configuration. */
export const directusClientOptionsSchema = directusConfigSchema
  .safeExtend({
    enabled: enabled.default(true),
    instance: directusInstanceSchema.prefault({}),
    client: directusClientSchema.prefault({ auth: { maskSecretsInPlayground: true } })
  })
  .superRefine((options, context) => {
    // The shared schema is intentionally composable; this client boundary owns the
    // authentication invariant after module setup has applied allowed dev defaults.
    if (options.client.auth.enabled && !options.client.auth.sessionSecret) {
      context.addIssue({
        code: "custom",
        path: ["client", "auth", "sessionSecret"],
        message: "client.auth.sessionSecret is required when authentication is enabled"
      });
    }

    const routes = [
      ["client.proxy.path", options.client.proxy.path],
      ["client.assets.path", options.client.assets.path],
      ["reserved /_directus/auth", "/_directus/auth"]
    ] as const;
    for (const [index, [name, path]] of routes.entries()) {
      for (const [otherName, otherPath] of routes.slice(index + 1)) {
        if (
          path === otherPath ||
          path.startsWith(`${otherPath}/`) ||
          otherPath.startsWith(`${path}/`)
        ) {
          context.addIssue({
            code: "custom",
            path: ["client", name.startsWith("client.proxy") ? "proxy" : "assets", "path"],
            message: `${name} overlaps with ${otherName}`
          });
        }
      }
    }
  });

export type ModuleOptions = z.input<typeof directusClientOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusClientOptionsSchema>;
