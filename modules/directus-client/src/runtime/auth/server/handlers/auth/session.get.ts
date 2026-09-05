import { defineEventHandler } from "h3";

import { readDirectusSessionSnapshot } from "../../auth";

export default defineEventHandler((event) => readDirectusSessionSnapshot(event));
