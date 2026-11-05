import { getRenderingExample } from "../../utils/email-examples";

export default defineEventHandler((event) =>
  getRenderingExample(new URL("/images/northstar-notebook.svg", getRequestURL(event)).href)
);
