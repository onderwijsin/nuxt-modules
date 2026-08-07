import { describe, expect, it } from "vitest";
import { newsletterSignupOptionsSchema } from "../src/config/options.schema";

const optionsSchema = newsletterSignupOptionsSchema;

describe("newsletter signup option shape", () => {
  it("accepts endpoint configuration and audience-specific Mailchimp servers", () => {
    const result = optionsSchema.safeParse({
      provider: "mailchimp",
      apiKey: "mailchimp-key",
      endpoint: {
        enabled: false,
        url: "https://newsletter.example.com/api/newsletter/signup"
      },
      lists: {
        default: "audience-a",
        options: [
          { label: "Nieuwsbrief A", id: "audience-a", server: "us4" },
          { label: "Nieuwsbrief B", id: "audience-b", server: "us5" }
        ]
      }
    });

    expect(result.success).toBe(true);
  });

  it("accepts Loops lists without Mailchimp server values", () => {
    const result = optionsSchema.safeParse({
      provider: "loops",
      apiKey: "loops-key",
      lists: { options: [{ label: "Nieuwsbrief", id: "newsletter" }] }
    });

    expect(result.success).toBe(true);
  });

  it("rejects Mailchimp lists without server values", () => {
    const result = optionsSchema.safeParse({
      provider: "mailchimp",
      apiKey: "mailchimp-key",
      lists: { options: [{ label: "Nieuwsbrief", id: "newsletter" }] }
    });

    expect(result.success).toBe(false);
  });

  it("rejects an endpoint URL that is neither relative nor HTTP(S)", () => {
    const result = optionsSchema.safeParse({
      endpoint: { enabled: false, url: "javascript:alert(1)" }
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty list options", () => {
    const result = optionsSchema.safeParse({ lists: { options: [] } });

    expect(result.success).toBe(false);
  });
});
