import { defineEventHandler } from "h3";

import { readDirectusSessionSnapshot } from "../../utils/auth";

export default defineEventHandler((event) => readDirectusSessionSnapshot(event));
