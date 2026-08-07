import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
const toastAdd = vi.hoisted(() => vi.fn());
const runtimeConfig = vi.hoisted(() => ({
  public: { newsletterSignup: { endpoint: { url: "/api/newsletter/signup" } } }
}));

vi.mock("ofetch", () => ({ $fetch: fetchMock }));
vi.mock("#imports", () => ({
  useRuntimeConfig: () => runtimeConfig,
  useToast: () => ({ add: toastAdd })
}));

import { useNewsletterSignup } from "../src/runtime/app/composables/newsletterSignup";
import { ERROR_CODES } from "../src/runtime/types/errors";

describe("useNewsletterSignup", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toastAdd.mockReset();
  });

  it("posts the public payload to the configured endpoint", async () => {
    fetchMock.mockResolvedValue({ success: true });
    const { signup } = useNewsletterSignup();
    const payload = { email: "ada@example.com", listId: "main" };

    await expect(signup(payload)).resolves.toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/newsletter/signup", {
      method: "POST",
      body: payload
    });
  });

  it("extracts normalized errors and identifies duplicate signups", () => {
    const { getErrorCode, isAlreadyExistsError } = useNewsletterSignup();
    const error = {
      data: {
        data: {
          code: ERROR_CODES.alreadyExists,
          httpStatusCode: 409
        }
      }
    };

    expect(getErrorCode(error)).toBe(ERROR_CODES.alreadyExists);
    expect(isAlreadyExistsError(error)).toBe(true);
    expect(getErrorCode({ data: { code: "unknown" } })).toBeUndefined();
    expect(getErrorCode(undefined)).toBeUndefined();
  });

  it("shows the Dutch duplicate, invalid-input, and general error toasts", () => {
    const { handleSignupError } = useNewsletterSignup();
    const createError = (code: string, httpStatusCode: number) => ({
      data: { code, httpStatusCode }
    });

    expect(handleSignupError(createError(ERROR_CODES.alreadyExists, 409))).toBe(true);
    expect(toastAdd).toHaveBeenLastCalledWith({
      title: "Je bent al ingeschreven",
      color: "warning"
    });

    expect(handleSignupError(createError(ERROR_CODES.invalidInput, 400))).toBe(true);
    expect(toastAdd).toHaveBeenLastCalledWith({ title: "Ongeldige invoer", color: "error" });

    expect(handleSignupError(new Error("network failure"))).toBe(true);
    expect(toastAdd).toHaveBeenLastCalledWith({
      title: "Er ging iets mis, probeer het nog een keer",
      color: "error"
    });
  });
});
