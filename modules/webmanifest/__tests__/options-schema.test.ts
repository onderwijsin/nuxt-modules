import { describe, expect, it } from "vitest";
import { webmanifestOptionsSchema } from "../src/config/options.schema";

describe("webmanifest option schema", () => {
  it("accepts the supported manifest collections", () => {
    const result = webmanifestOptionsSchema.safeParse({
      manifest: {
        icons: [{ src: "/icon.png", purpose: "any" }],
        screenshots: [{ src: "/shot.png", form_factor: "wide" }],
        shortcuts: [{ name: "Open", url: "/open", icons: [{ src: "/open.png" }] }],
        protocol_handlers: [{ protocol: "web+example", url: "/handle/%s" }],
        launch_handler: { route_to: "existing-client" }
      }
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid manifest enum values", () => {
    expect(
      webmanifestOptionsSchema.safeParse({ manifest: { display: "unsupported" } }).success
    ).toBe(false);
  });
});
