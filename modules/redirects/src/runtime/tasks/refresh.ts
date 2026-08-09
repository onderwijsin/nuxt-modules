import { defineTask } from "nitropack/runtime";

import { refreshRedirects } from "../server/utils/refresh";

/** Refreshes the redirects index from startup-registered consumer sources. */
export default defineTask({
  meta: {
    name: "redirects:refresh",
    description: "Refresh the redirects storage index."
  },
  async run() {
    console.info("Refreshing redirects storage index...");
    const redirects = await refreshRedirects();
    return { result: { count: Object.keys(redirects).length } };
  }
});
