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
      {
        label: "client.proxy.path",
        path: options.client.proxy.path,
        issuePath: ["client", "proxy", "path"]
      },
      {
        label: "client.assets.path",
        path: options.client.assets.path,
        issuePath: ["client", "assets", "path"]
      },
      {
        label: "reserved /_directus/auth",
        path: "/_directus/auth",
        issuePath: ["client", "proxy", "path"]
      }
    ] as const;

    function routesOverlap(left: string, right: string): boolean {
      return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
    }

    for (const [index, route] of routes.entries()) {
      for (const otherRoute of routes.slice(index + 1)) {
        if (!routesOverlap(route.path, otherRoute.path)) continue;
        context.addIssue({
          code: "custom",
          path: [...route.issuePath],
          message: `${route.label} overlaps with ${otherRoute.label}`
        });
      }
    }
  });

export type ModuleOptions = z.input<typeof directusClientOptionsSchema>;
export type ResolvedModuleOptions = z.output<typeof directusClientOptionsSchema>;
