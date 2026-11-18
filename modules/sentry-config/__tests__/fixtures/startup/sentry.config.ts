import { defineSentryServerConfig } from "../../../src/runtime";
import type { SentryInitConfig } from "../../../src/runtime";

type Transport = ReturnType<NonNullable<SentryInitConfig["transport"]>>;

export const state: { initializations: number; envelopes: string[] } = {
  initializations: 0,
  envelopes: []
};

export default defineSentryServerConfig(({ runtime, runtimeConfig }) => {
  state.initializations++;
  return {
    dsn: "https://public@127.0.0.1/1",
    environment: runtime,
    release: runtimeConfig.app.buildId,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Consumer hooks must survive the config-file import and default merge.
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
        state.envelopes.push(JSON.stringify(envelope));
        return Promise.resolve({ statusCode: 200 });
      },
      flush: () => Promise.resolve(true)
    })
  };
});
