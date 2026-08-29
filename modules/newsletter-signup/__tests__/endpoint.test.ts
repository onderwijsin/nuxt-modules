import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEvent } from "../../../packages/test-utils/src";

const runtimeConfig = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const body = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const readBodyMock = vi.hoisted(() => vi.fn(async () => body.value));
const loopsMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const mailchimpMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const enforceRateLimitMock = vi.hoisted(() => vi.fn(async () => ({})));

vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig.value
}));
vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  createEvent: () => ({}),
  readBody: readBodyMock,
  createError: ({ statusCode, statusMessage, data }: Record<string, unknown>) =>
    Object.assign(new Error(String(statusMessage)), { statusCode, statusMessage, data })
}));
vi.mock("@onderwijsin/nuxt-simple-rate-limiter/runtime", () => ({
  enforceRateLimit: enforceRateLimitMock
}));
vi.mock("../src/runtime/server/providers/loops", () => ({
  subscribeToLoops: loopsMock
}));
vi.mock("../src/runtime/server/providers/mailchimp", () => ({
  subscribeToMailchimp: mailchimpMock
}));

async function loadHandler() {
  return (await import("../src/runtime/server/api/newsletter/signup.post")).default;
}

describe("newsletter signup endpoint", () => {
  beforeEach(() => {
    runtimeConfig.value = {};
    body.value = {};
    readBodyMock.mockClear();
    loopsMock.mockClear();
    mailchimpMock.mockClear();
    enforceRateLimitMock.mockClear();
  });

  it("returns a configuration error when provider credentials are missing", async () => {
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 500 });
    expect(loopsMock).not.toHaveBeenCalled();
    expect(mailchimpMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input and unknown fields", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "list" } }
    };
    body.value = { email: "not-an-email", unexpected: true };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects arbitrary properties without a configured target", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "list" } }
    };
    body.value = { email: "ada@example.com", favoriteColor: "blue" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects reserved properties even when they have a configured target", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        fields: { subscribed: { target: "subscribed" } },
        lists: { default: "list" }
      }
    };
    body.value = { email: "ada@example.com", subscribed: "true" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("accepts supported custom property values configured with targets", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        fields: {
          favoriteColor: { target: "favorite_color" },
          subscriberCount: { target: "subscriber_count" },
          isActive: { target: "is_active" },
          interests: { target: "interests" },
          nickname: { target: "nickname" }
        },
        lists: { default: "list" }
      }
    };
    body.value = {
      email: "ada@example.com",
      favoriteColor: "blue",
      subscriberCount: 3,
      isActive: false,
      interests: ["math", "history"],
      nickname: null
    };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
    expect(loopsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        favoriteColor: "blue",
        subscriberCount: 3,
        isActive: false,
        interests: ["math", "history"],
        nickname: null
      }),
      "list",
      runtimeConfig.value.newsletterSignup
    );
  });

  it("accepts payload values at the configured maximum lengths", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        fields: { organization: { target: "organization" } },
        lists: { default: "list" }
      }
    };
    body.value = {
      email: "a".repeat(500) + "@example.com",
      firstName: "a".repeat(256),
      lastName: "a".repeat(256),
      organization: "a".repeat(1024),
      source: "a".repeat(256)
    };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
  });

  it("rejects payload values above their maximum lengths", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "list" } }
    };
    body.value = { email: "ada@example.com", organization: "a".repeat(1025) };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("requires a target for Loops properties without a default mapping", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "list" } }
    };
    body.value = { email: "ada@example.com", organization: "Analytical Engines" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("enforces configured required fields and list options", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        fields: { firstName: { required: true } },
        lists: { options: [{ label: "Main", id: "main" }] }
      }
    };
    body.value = { email: "ada@example.com", listId: "unknown" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("enforces user identity fields configured as required", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        fields: { userId: { required: true }, userGroup: { required: true } },
        lists: { default: "main" }
      }
    };
    body.value = { email: "ada@example.com", userId: "user-1" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("forwards optional user identity fields", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "main" } }
    };
    body.value = { email: "ada@example.com", userId: "user-1", userGroup: "customers" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
    expect(loopsMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", userGroup: "customers" }),
      "main",
      runtimeConfig.value.newsletterSignup
    );
  });

  it("defaults source to api and uses the configured default Loops list", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "loops",
        apiKey: "key",
        lists: { default: "main" }
      }
    };
    body.value = { email: "ada@example.com", firstName: "Ada" };
    const handler = await loadHandler();
    const event = createTestEvent();

    await expect(handler(event)).resolves.toEqual({ success: true });
    expect(enforceRateLimitMock).toHaveBeenCalledWith(event, { max: 5, duration: 60, ban: 900 });
    expect(loopsMock).toHaveBeenCalledWith(
      {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: undefined,
        organization: undefined,
        source: "api",
        listId: undefined
      },
      "main",
      runtimeConfig.value.newsletterSignup
    );
  });

  it("rejects a client-selected list when only a default list is configured", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "main" } }
    };
    body.value = { email: "ada@example.com", listId: "other-list" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("uses the selected Mailchimp audience server", async () => {
    const config = {
      provider: "mailchimp",
      apiKey: "key",
      lists: {
        options: [{ label: "Events", id: "events", server: "us5" }]
      }
    };
    runtimeConfig.value = { newsletterSignup: config };
    body.value = { email: "ada@example.com", listId: "events", source: "events-page" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).resolves.toEqual({ success: true });
    expect(mailchimpMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "events-page", listId: "events" }),
      "events",
      "us5",
      config
    );
  });

  it("includes the ban expiry in rate-limited responses", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "main" } }
    };
    enforceRateLimitMock.mockRejectedValueOnce(
      Object.assign(new Error("Too Many Requests"), {
        statusCode: 429,
        data: { bannedUntil: 1_800_000_000_000 }
      })
    );
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({
      statusCode: 429,
      data: {
        code: "NEWSLETTER_SIGNUP_RATE_LIMITED",
        bannedUntil: 1_800_000_000_000
      }
    });
    expect(loopsMock).not.toHaveBeenCalled();
  });

  it("returns a configuration error when Mailchimp has no server", async () => {
    runtimeConfig.value = {
      newsletterSignup: {
        provider: "mailchimp",
        apiKey: "key",
        lists: { default: "audience" }
      }
    };
    body.value = { email: "ada@example.com" };
    const handler = await loadHandler();

    await expect(handler(createTestEvent())).rejects.toMatchObject({ statusCode: 500 });
    expect(mailchimpMock).not.toHaveBeenCalled();
  });
});
