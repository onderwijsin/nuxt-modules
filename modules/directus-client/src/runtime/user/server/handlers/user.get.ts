import { defineEventHandler } from "h3";

import { resolveDirectusUserResponse } from "../resolve-user";

export default defineEventHandler(resolveDirectusUserResponse);
