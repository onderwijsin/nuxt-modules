import { describe, expect, it } from "vitest";

import { createTextTranslator } from "../src/runtime/translator";

describe("createTextTranslator", () => {
  const translate = createTextTranslator({
    signup: {
      button: "Sign up",
      signedUpAs: "Signed up as {audience}"
    },
    account: {
      profile: {
        contact: {
          email: {
            label: "Email address for {name}"
          }
        }
      }
    }
  } as const);

  it("resolves dotted keys", () => {
    expect(translate("signup.button")).toBe("Sign up");
  });

  it("replaces named parameters", () => {
    expect(translate("signup.signedUpAs", { audience: "trainee" })).toBe("Signed up as trainee");
  });

  it("resolves keys deeper than two levels", () => {
    expect(translate("account.profile.contact.email.label", { name: "Ada" })).toBe(
      "Email address for Ada"
    );
  });

  it("keeps missing parameters visible", () => {
    // @ts-expect-error - the public translator contract requires the placeholder parameter.
    expect(translate("signup.signedUpAs")).toBe("Signed up as {audience}");
  });

  it("throws for unknown keys", () => {
    expect(() => translate("signup.missing" as never)).toThrow("Unknown text key");
  });
});
