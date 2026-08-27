type NewsletterProvider = "loops" | "mailchimp";

export interface NewsletterSignupInput {
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  userId?: string;
  userGroup?: string;
  source: string;
  listId?: string;
}

export const DEFAULT_TARGETS: Record<NewsletterProvider, Record<string, string>> = {
  loops: {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
    organization: "organization",
    userId: "userId",
    userGroup: "userGroup",
    source: "source"
  },
  mailchimp: {
    email: "email_address",
    firstName: "FNAME",
    lastName: "LNAME",
    organization: "ORG"
  }
};

export type NewsletterFieldName =
  | "email"
  | "firstName"
  | "lastName"
  | "organization"
  | "userId"
  | "userGroup"
  | "source";
export const FIELD_NAMES: readonly NewsletterFieldName[] = [
  "email",
  "firstName",
  "lastName",
  "organization",
  "userId",
  "userGroup",
  "source"
];
