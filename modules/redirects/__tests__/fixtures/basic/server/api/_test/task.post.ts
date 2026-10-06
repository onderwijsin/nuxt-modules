import { defineEventHandler } from "h3";
import { runTask } from "nitropack/runtime";

/**
 * Runs the consumer-owned redirect refresh task.
 * @returns The refreshed redirect count.
 */
export default defineEventHandler(() => runTask("redirects:refresh"));
