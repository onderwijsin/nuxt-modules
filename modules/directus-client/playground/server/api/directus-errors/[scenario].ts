import { createError, defineEventHandler, getRouterParam, setResponseStatus } from "h3";

const scenarios = {
  otp: {
    status: 401,
    code: "INVALID_OTP",
    message: "The one-time password is incorrect."
  },
  forbidden: {
    status: 403,
    code: "FORBIDDEN",
    message: "You don't have permission to access this resource."
  },
  invalidCredentials: {
    status: 401,
    code: "INVALID_CREDENTIALS",
    message: "Invalid user credentials."
  },
  tokenExpired: {
    status: 401,
    code: "TOKEN_EXPIRED",
    message: "Token has expired."
  },
  invalidToken: {
    status: 403,
    code: "INVALID_TOKEN",
    message: "The access token is malformed or invalid."
  },
  validation: {
    status: 400,
    code: "FAILED_VALIDATION",
    message: "The title must be at least three characters long."
  },
  rateLimited: {
    status: 429,
    code: "REQUESTS_EXCEEDED",
    message: "Too many requests. Please try again later."
  },
  unavailable: {
    status: 503,
    code: "SERVICE_UNAVAILABLE",
    message: "The Directus service is temporarily unavailable."
  },
  routeNotFound: {
    status: 404,
    code: "ROUTE_NOT_FOUND",
    message: "The requested Directus endpoint does not exist."
  }
} as const;

const nitroScenarios = {
  nitroEmail: {
    code: "invalid_format",
    path: ["email"],
    message: "Invalid email address"
  },
  nitroPassword: {
    code: "too_big",
    maximum: 512,
    path: ["password"],
    message: "Too big: expected string to have <=512 characters"
  },
  nitroOtp: {
    code: "too_big",
    maximum: 6,
    path: ["otp"],
    message: "Too big: expected string to have <=6 characters"
  },
  nitroResetToken: {
    code: "too_big",
    maximum: 1024,
    path: ["token"],
    message: "Too big: expected string to have <=1024 characters"
  }
} as const;

/** Returns a Directus-shaped failure for playground error handling examples.
 * @param event Nitro request event.
 * @returns A Directus-compatible error response.
 */
export default defineEventHandler((event) => {
  const scenario = getRouterParam(event, "scenario");
  const nitroResult = Object.entries(nitroScenarios).find(([key]) => key === scenario)?.[1];
  if (nitroResult) {
    setResponseStatus(event, 400);
    return { issues: [nitroResult] };
  }

  const result = Object.entries(scenarios).find(([key]) => key === scenario)?.[1];

  if (!result) {
    throw createError({ statusCode: 404, statusMessage: "Unknown error scenario" });
  }

  setResponseStatus(event, result.status);
  return {
    errors: [
      {
        message: result.message,
        extensions: { code: result.code }
      }
    ]
  };
});
