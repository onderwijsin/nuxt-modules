type NewsletterProvider = "loops" | "mailchimp";

export interface NewsletterSignupInput {
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  source: string;
  listId?: string;
}

export const DEFAULT_TARGETS: Record<NewsletterProvider, Record<string, string>> = {
  loops: {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    organization: "organization",
    source: "source"
  },
  mailchimp: {
    email: "email_address",
    firstName: "FNAME",
    lastName: "LNAME",
    organization: "ORG"
  }
};

export type NewsletterFieldName = "email" | "firstName" | "lastName" | "organization" | "source";
export const FIELD_NAMES: readonly NewsletterFieldName[] = [
  "email",
  "firstName",
  "lastName",
  "organization",
  "source"
];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
