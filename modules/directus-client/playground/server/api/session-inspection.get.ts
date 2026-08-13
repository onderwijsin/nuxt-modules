import { getCookie, defineEventHandler } from "h3";
import { useRuntimeConfig } from "#imports";

import { getDirectusSessionDetails } from "../../../src/runtime/server/utils/session";

function maskSecret(value: string): string {
  if (value.length < 8) return "••••••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const cookieName = config.directusClient.auth.cookie.name;
  const encrypted = getCookie(event, cookieName);
  if (!encrypted) {
    return { status: "missing", encrypted: null, decrypted: null };
  }

  const resolved = await getDirectusSessionDetails(event);
  if (!resolved) {
    return {
      status: "invalid",
      encrypted: { value: encrypted, length: encrypted.length },
      decrypted: null
    };
  }

  const mask = config.public.directusClient.auth.maskSecretsInPlayground;
  const session = resolved.session;
  return {
    status: "valid",
    encrypted: { value: encrypted, length: encrypted.length },
    decrypted: {
      formatVersion: 1,
      matchedSecretSlot: resolved.matchedSecretSlot,
      accessToken: mask ? maskSecret(session.accessToken) : session.accessToken,
      refreshToken: mask ? maskSecret(session.refreshToken) : session.refreshToken,
      expiresAt: session.expiresAt,
      snapshot: session.snapshot
    }
  };
});
