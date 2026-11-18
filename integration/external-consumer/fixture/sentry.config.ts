import { defineSentryServerConfig } from "@onderwijsin/nuxt-sentry-config/runtime";
import type { SentryInitConfig } from "@onderwijsin/nuxt-sentry-config/runtime";

type Transport = ReturnType<NonNullable<SentryInitConfig["transport"]>>;

export const state: { initializations: number; events: string[] } = {
  initializations: 0,
  events: []
};

export default defineSentryServerConfig(({ runtime }) => {
  state.initializations++;
  return {
    dsn: "https://public@127.0.0.1/1",
    environment: runtime,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Verify that consumer-owned redaction runs after the SDK attaches request data.
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
    transport: () => ({
      send(envelope: Parameters<Transport["send"]>[0]) {
        for (const [header, payload] of envelope[1]) {
          if (header.type === "event") state.events.push(JSON.stringify(payload));
        }
        return Promise.resolve({ statusCode: 200 });
      },
      flush: () => Promise.resolve(true)
    })
  };
});
