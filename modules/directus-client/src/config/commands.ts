import { z } from "zod";
import {
  supportedDirectusCommands,
  directusCommandsSchema
} from "@onderwijsin/nuxt-directus-config/schema";

const supportedCommandSet = new Set<string>(supportedDirectusCommands);

export type DirectusCommand = z.infer<typeof directusCommandsSchema>;

/**
 * Validates the configured command list and gives consumers an actionable error.
 *
 * @param commands Consumer-selected SDK command names.
 * @returns The validated command names.
 */
export function parseDirectusCommands(commands: readonly string[]): DirectusCommand[] {
  const result = z.array(directusCommandsSchema).safeParse(commands);
  if (!result.success) {
    const invalid = commands.filter((command) => !supportedCommandSet.has(command));
    throw new Error(
      `Invalid directusClient.client.commands value${invalid.length === 1 ? "" : "s"}: ${invalid.join(
        ", "
      )}. Supported commands: ${supportedDirectusCommands.join(", ")}. Import other SDK commands explicitly from @directus/sdk.`
    );
  }
  return result.data;
}
