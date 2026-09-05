import { defineEventHandler } from "h3";

import { readDirectusSessionSnapshot } from "../refresh";

export default defineEventHandler((event) => readDirectusSessionSnapshot(event));
