import { defineEventHandler } from "h3";
import { assertStorageAdmin, getStorageAdminConfig } from "../../utils/storage-admin";

/**
 * Returns the allowed mount and prefix selectors for the development storage page.
 * @param event - Current H3 request event.
 * @returns Configured mount and prefix selectors.
 */
export default defineEventHandler((event) => {
  const config = getStorageAdminConfig(event);
  assertStorageAdmin(event, config);

  return {
    data: {
      mounts: Object.entries(config.mounts).map(([mount, options]) => ({
        mount,
        prefixes: options.prefixes
      }))
    }
  };
});
