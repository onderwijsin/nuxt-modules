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

  it("accepts user identity fields and their required configuration", () => {
    const result = optionsSchema.safeParse({
      provider: "loops",
      apiKey: "loops-key",
      fields: {
        userId: { required: true },
        userGroup: { required: true }
      },
      lists: { default: "newsletter" }
    });

    expect(result.success).toBe(true);
  });

  it("accepts arbitrary contact properties with provider targets", () => {
    const result = optionsSchema.safeParse({
      provider: "loops",
      apiKey: "loops-key",
      fields: { favoriteColor: { target: "favorite_color" } },
      lists: { default: "newsletter" }
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

  it.each(["mailchimp.example.com", "https://us4.api.mailchimp.com", "us-4", " us4 "])(
    "rejects an invalid Mailchimp server value: %s",
    (server) => {
      const result = optionsSchema.safeParse({
        provider: "mailchimp",
        apiKey: "mailchimp-key",
        server,
        lists: { default: "audience" }
      });

      expect(result.success).toBe(false);
    }
  );

  it("accepts a Mailchimp server prefix with a numeric datacenter", () => {
    const result = optionsSchema.safeParse({
      provider: "mailchimp",
      apiKey: "mailchimp-key",
      server: "us21",
      lists: { default: "audience" }
    });

    expect(result.success).toBe(true);
  });

  it("validates per-audience Mailchimp server prefixes", () => {
    const result = optionsSchema.safeParse({
      provider: "mailchimp",
      apiKey: "mailchimp-key",
      lists: {
        options: [{ label: "Audience", id: "audience", server: "https://us21" }]
      }
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
