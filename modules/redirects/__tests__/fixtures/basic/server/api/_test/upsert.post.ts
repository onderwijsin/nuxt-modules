import { defineEventHandler } from "h3";

import { upsertRedirect } from "../../../../../../src/runtime";

/**
 * Creates a redirect through the public webhook mutation API.
 *
 * @returns The normalized redirect created by the fixture.
 */
export default defineEventHandler(async () => ({
  data: await upsertRedirect({
    from: "/webhook-origin?campaign=spring",
    to: "/webhook-destination",
    statusCode: 308
  })
}));
