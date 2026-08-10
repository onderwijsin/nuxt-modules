import { createError, type EventHandler } from "h3";

/** Placeholder route registered in stage 2; Directus forwarding is stage 4. */
const handler: EventHandler = () => {
  throw createError({ statusCode: 501, statusMessage: "Directus proxy is not implemented yet" });
};

export default handler;
