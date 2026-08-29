type NewsletterProvider = "loops" | "mailchimp";

export type NewsletterSignupPropertyValue = string | number | boolean | string[] | null | undefined;

export interface NewsletterSignupInput {
  email: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  userId?: string;
  userGroup?: string;
  source: string;
  listId?: string;
  [property: string]: NewsletterSignupPropertyValue;
}

/** Contact properties reserved for newsletter signup control data. */
export const NON_ALLOWED_PROPERTIES = ["listId", "subscribed"] as const;

export const DEFAULT_TARGETS: Record<NewsletterProvider, Record<string, string>> = {
  loops: {
    email: "email",
    firstName: "firstName",
    lastName: "lastName",
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
