import { defineEventHandler } from "h3";
import { useStorage } from "nitropack/runtime";

const TARGETS = [
  { mount: "cache", base: "pages" },
  { mount: "cache", base: "kennisbank:articles" },
  { mount: "cache", base: "media:videos" },
  { mount: "demo", base: "drafts" },
  { mount: "demo", base: "events" }
] as const;

/**
 * Adds a small randomized set of records to the playground's configured storage mounts.
 * @returns The mount and key of every created record.
 */
export default defineEventHandler(async () => {
  const created = await Promise.all(
    Array.from({ length: 3 + Math.floor(Math.random() * 4) }, async (_, index) => {
      const target = TARGETS[Math.floor(Math.random() * TARGETS.length)]!;
      const key = `${target.base}:sample-${Date.now()}-${index}`;
      const value = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        message: `Sample record ${index + 1}`,
        random: Math.floor(Math.random() * 1000)
      };

      await useStorage(target.mount).setItem(key, value);
      return { mount: target.mount, key };
    })
  );

  return { data: { created } };
});
