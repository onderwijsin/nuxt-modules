import { getQuery, type H3Event } from "h3";

import {
  parseDirectusPreviewContext,
  type DirectusPreviewContext,
  type DirectusPreviewOptions
} from "./preview";

/** Reads and validates the preview context from a Nitro request.
 * @param event Nitro request event.
 * @param options Preview configuration.
 * @returns The validated preview context.
 */
export function getDirectusPreviewContext(
  event: H3Event,
  options: DirectusPreviewOptions
): DirectusPreviewContext {
  return parseDirectusPreviewContext(getQuery(event), options);
}
