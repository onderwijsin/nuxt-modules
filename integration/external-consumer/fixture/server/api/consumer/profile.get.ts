import { readFileSync } from "node:fs";
import { join } from "node:path";

export default defineEventHandler(() =>
  JSON.parse(readFileSync(join(process.cwd(), "consumer-profile.json"), "utf8"))
);
