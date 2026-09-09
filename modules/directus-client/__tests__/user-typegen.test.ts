import { describe, expect, it } from "vitest";

import { generateDirectusUserTypeDeclaration } from "../src/config/user-typegen";

describe("Directus current-user type generation", () => {
  it("derives the selected Directus user from flat and relational fields", () => {
    const declaration = generateDirectusUserTypeDeclaration(
      ["id", "email", { role: ["id", "name"] }],
      undefined,
      true
    );

    expect(declaration).toContain('import type { DirectusUser, Schema } from "#directus";');
    expect(declaration).not.toContain(
      'import type { DirectusUser, ReadUserOutput } from "@directus/sdk";'
    );
    expect(declaration).toContain(
      "type DirectusSelectedUser = ReadUserOutput<Schema, DirectusUserFieldsQuery, DirectusUser>;"
    );
    expect(declaration).toContain(
      'type DirectusUserFieldsQuery = { fields: readonly ["id", "email", { readonly "role": readonly ["id", "name"] }] };'
    );
    expect(declaration).toContain("type ResolvedDirectusUserResponse = DirectusSelectedUser;");
  });

  it("infers the response from the effective executable mapper", () => {
    const declaration = generateDirectusUserTypeDeclaration(["id"], "/project/directus.config.ts");

    expect(declaration).toContain(
      'type DirectusConfigSource = typeof import("/project/directus.config.ts")["default"];'
    );
    expect(declaration).toContain(
      "type ResolvedDirectusUserResponse = DirectusUserMapper extends (...args: never[]) => infer Result"
    );
  });

  it("uses the generic SDK user when automated schema generation is disabled", () => {
    const declaration = generateDirectusUserTypeDeclaration(["id"]);

    expect(declaration).toContain(
      'import type { DirectusUser, ReadUserOutput } from "@directus/sdk";'
    );
    expect(declaration).toContain(
      "type DirectusSelectedUser = ReadUserOutput<Schema, DirectusUserFieldsQuery, DirectusUser<Schema>>;"
    );
  });

  it("emits a safe fallback while current-user fetching is disabled", () => {
    const declaration = generateDirectusUserTypeDeclaration([]);

    expect(declaration).toContain(
      'import type { DirectusUser, ReadUserOutput } from "@directus/sdk";'
    );
    expect(declaration).toContain("type DirectusSelectedUser = Record<string, unknown>;");
    expect(declaration).toContain("export type SelectedDirectusUser = DirectusSelectedUser;");
    expect(declaration).toContain(
      "export type DirectusUserResponse = ResolvedDirectusUserResponse;"
    );
  });
});
