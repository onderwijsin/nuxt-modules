import { defineEventHandler } from "h3";

import { refreshRedirects } from "../../../../../../src/runtime";

/**
 * Refreshes the test fixture through the public consumer runtime API.
 *
 * @returns The newly written redirect index.
 */
export default defineEventHandler(async () => ({ data: await refreshRedirects() }));
