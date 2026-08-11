import { z } from "zod";

/** SDK command exports reviewed for consumer auto-import registration. */
export const supportedDirectusCommands = [
  "aggregate",
  "createComment",
  "updateComment",
  "deleteComment",
  "createField",
  "createItem",
  "createItems",
  "deleteField",
  "deleteFile",
  "deleteFiles",
  "readActivities",
  "readActivity",
  "deleteItem",
  "deleteItems",
  "deleteUser",
  "deleteUsers",
  "importFile",
  "readCollection",
  "readCollections",
  "createCollection",
  "updateCollection",
  "deleteCollection",
  "readContentVersions",
  "readContentVersion",
  "readField",
  "readFieldsByCollection",
  "readFields",
  "readFile",
  "readFiles",
  "readItem",
  "readItems",
  "readSingleton",
  "readMe",
  "readPolicies",
  "readPolicy",
  "createUser",
  "createUsers",
  "readUser",
  "readUsers",
  "updateField",
  "updateFile",
  "updateFiles",
  "updateFolder",
  "updateFolders",
  "updateItem",
  "updateItems",
  "updateSingleton",
  "updateMe",
  "updateUser",
  "updateUsers",
  "uploadFiles",
  "withSearch",
  "withOptions"
] as const;

export const directusCommandSchema = z.enum(supportedDirectusCommands);
const supportedCommandSet = new Set<string>(supportedDirectusCommands);

export type DirectusCommand = z.infer<typeof directusCommandSchema>;

/**
 * Validates the configured command list and gives consumers an actionable error.
 *
 * @param commands Consumer-selected SDK command names.
 * @returns The validated command names.
 */
export function parseDirectusCommands(commands: readonly string[]): DirectusCommand[] {
  const result = z.array(directusCommandSchema).safeParse(commands);
  if (!result.success) {
    const invalid = commands.filter((command) => !supportedCommandSet.has(command));
    throw new Error(
      `Invalid directus.commands value${invalid.length === 1 ? "" : "s"}: ${invalid.join(
        ", "
      )}. Supported commands: ${supportedDirectusCommands.join(", ")}. Import other SDK commands explicitly from @directus/sdk.`
    );
  }
  return result.data;
}
