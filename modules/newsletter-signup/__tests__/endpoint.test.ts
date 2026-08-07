import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeConfig = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const body = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const readBodyMock = vi.hoisted(() => vi.fn(async () => body.value));
const loopsMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const mailchimpMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
const storage = vi.hoisted(() => new Map<string, unknown>());

vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig.value
}));
vi.mock("h3", () => ({
  defineEventHandler: (handler: unknown) => handler,
  readBody: readBodyMock,
  getRequestIP: () => "127.0.0.1",
  createError: ({ statusCode, statusMessage, data }: Record<string, unknown>) =>
    Object.assign(new Error(String(statusMessage)), { statusCode, statusMessage, data })
}));
vi.mock("nitropack/runtime", () => ({
  useStorage: () => ({
    getItem: async (key: string) => storage.get(key),
    setItem: async (key: string, value: unknown) => storage.set(key, value)
  })
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
    storage.clear();
  });

  it("returns a configuration error when provider credentials are missing", async () => {
    const handler = await loadHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 500 });
    expect(loopsMock).not.toHaveBeenCalled();
    expect(mailchimpMock).not.toHaveBeenCalled();
  });

  it("rejects invalid input and unknown fields", async () => {
    runtimeConfig.value = {
      newsletterSignup: { provider: "loops", apiKey: "key", lists: { default: "list" } }
    };
    body.value = { email: "not-an-email", unexpected: true };
    const handler = await loadHandler();

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
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

    await expect(handler({})).rejects.toMatchObject({ statusCode: 400 });
    expect(loopsMock).not.toHaveBeenCalled();
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

    await expect(handler({})).resolves.toEqual({ success: true });
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

    await expect(handler({})).resolves.toEqual({ success: true });
    expect(mailchimpMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: "events-page", listId: "events" }),
      "events",
      "us5",
      config
    );
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

    await expect(handler({})).rejects.toMatchObject({ statusCode: 500 });
    expect(mailchimpMock).not.toHaveBeenCalled();
  });
});
