import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("ofetch", () => ({ $fetch: fetchMock }));

import { subscribeToLoops } from "../src/runtime/server/providers/loops";
import { subscribeToMailchimp } from "../src/runtime/server/providers/mailchimp";
import { NEWSLETTER_SIGNUP_ERROR_CODES } from "../src/runtime/types/errors";
import type { NewsletterSignupInput } from "../src/runtime/shared";
import type { ModuleOptions } from "../src/types/options";

const input: NewsletterSignupInput = {
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  organization: "Analytical Engines",
  source: "homepage"
};

const loopsConfig: ModuleOptions = { apiKey: "loops-key", fields: {} };
const mailchimpConfig: ModuleOptions = { apiKey: "mailchimp-key", fields: {} };

describe("newsletter provider adapters", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("uses the Loops update endpoint and includes the mailing list", async () => {
    fetchMock.mockResolvedValue({ success: true, id: "contact-id" });

    await expect(subscribeToLoops(input, "loops-list", loopsConfig)).resolves.toEqual({
      success: true
    });

    expect(fetchMock).toHaveBeenCalledWith("https://app.loops.so/api/v1/contacts/update", {
      method: "PUT",
      headers: { Authorization: "Bearer loops-key" },
      body: {
        email: "ada@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        organization: "Analytical Engines",
        source: "homepage",
        mailingLists: { "loops-list": true }
      }
    });
  });

  it("maps a Loops conflict to the already-subscribed error", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("conflict"), { status: 409 }));

    await expect(subscribeToLoops(input, "loops-list", loopsConfig)).rejects.toMatchObject({
      statusCode: 429,
      data: {
        code: NEWSLETTER_SIGNUP_ERROR_CODES.alreadyExists,
        httpStatusCode: 429
      }
    });
  });

  it("maps other Loops client errors to invalid input", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("bad request"), { status: 422 }));

    await expect(subscribeToLoops(input, "loops-list", loopsConfig)).rejects.toMatchObject({
      statusCode: 400,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput }
    });
  });

  it("maps Loops provider payload and transport failures separately", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("provider"), { data: { error: "upstream" } })
    );
    await expect(subscribeToLoops(input, "loops-list", loopsConfig)).rejects.toMatchObject({
      statusCode: 502,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.provider }
    });

    fetchMock.mockRejectedValueOnce(new Error("network"));
    await expect(subscribeToLoops(input, "loops-list", loopsConfig)).rejects.toMatchObject({
      statusCode: 502,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.server }
    });
  });

  it("applies configured provider targets", async () => {
    fetchMock.mockResolvedValue({ success: true, id: "contact-id" });

    await subscribeToLoops(input, "loops-list", {
      ...loopsConfig,
      fields: { firstName: { target: "given_name" } }
    });

    expect(fetchMock.mock.calls[0]?.[1]?.body).toMatchObject({ given_name: "Ada" });
  });

  it("uses the selected Mailchimp audience server and sends source as a tag", async () => {
    fetchMock.mockResolvedValue({ email_address: input.email, status: "subscribed" });

    await expect(
      subscribeToMailchimp(input, "audience-b", "us5", mailchimpConfig)
    ).resolves.toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://us5.api.mailchimp.com/3.0/lists/audience-b/members",
      {
        method: "POST",
        headers: {
          Authorization: "apikey mailchimp-key",
          "Content-Type": "application/json"
        },
        body: {
          email_address: input.email,
          merge_fields: {
            FNAME: "Ada",
            LNAME: "Lovelace",
            ORG: "Analytical Engines"
          },
          status: "subscribed",
          tags: ["homepage"]
        }
      }
    );
  });

  it("maps Mailchimp member-exists responses to the already-subscribed error", async () => {
    fetchMock.mockRejectedValue(
      Object.assign(new Error("member exists"), {
        status: 400,
        data: { title: "Member Exists" }
      })
    );

    await expect(
      subscribeToMailchimp(input, "audience-a", "us4", mailchimpConfig)
    ).rejects.toMatchObject({
      statusCode: 429,
      data: {
        code: NEWSLETTER_SIGNUP_ERROR_CODES.alreadyExists,
        httpStatusCode: 429
      }
    });
  });

  it("maps other Mailchimp client errors to invalid input", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("bad request"), { status: 400 }));

    await expect(
      subscribeToMailchimp(input, "audience-a", "us4", mailchimpConfig)
    ).rejects.toMatchObject({
      statusCode: 400,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.invalidInput }
    });
  });

  it("maps Mailchimp transport failures to a server error", async () => {
    fetchMock.mockRejectedValue(new Error("network"));

    await expect(
      subscribeToMailchimp(input, "audience-a", "us4", mailchimpConfig)
    ).rejects.toMatchObject({
      statusCode: 502,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.server }
    });
  });

  it("rejects malformed provider responses", async () => {
    fetchMock.mockResolvedValue({ email_address: input.email });

    await expect(
      subscribeToMailchimp(input, "audience-a", "us4", mailchimpConfig)
    ).rejects.toMatchObject({
      statusCode: 502,
      data: { code: NEWSLETTER_SIGNUP_ERROR_CODES.server }
    });
  });
});
