import { readItems, type Query, type RestCommand } from "@directus/sdk";
import type { H3Event } from "h3";
import { useDirectusItemByPath } from "#item-app";
import { useDirectusServerItemByPath } from "#item-server";
import { fetchDirectusItemByPath } from "#item-fetch";

export interface Audience {
  id: string;
  slug: string;
  title: string;
}
export interface EventsAudience {
  id: number;
  audiences_id?: Audience | string | null;
}
export interface Event {
  id: string;
  slug: string;
  title: string;
  audiences: EventsAudience[] | string[];
}
export interface Schema {
  events: Event[];
  events_audiences: EventsAudience[];
  audiences: Audience[];
}

declare const event: H3Event;
declare const execute: <Output>(command: RestCommand<Output, Schema>) => Promise<Output>;

/** Checks selected junction fields through every public lookup and preview branch.
 * @returns A value used to verify the nullable result contract.
 */
async function checkInference() {
  const query = {
    fields: ["id", "slug", { audiences: [{ audiences_id: ["id", "slug"] }] }],
    filter: { slug: { _eq: "example" } }
  } satisfies Query<Schema, Event>;
  const expected = await execute(readItems("events", query));
  const app = await useDirectusItemByPath("events", query);
  const server = await useDirectusServerItemByPath(event, "events", query);
  const normal = await fetchDirectusItemByPath("events", query, { isPreview: false }, execute);
  const preview = await fetchDirectusItemByPath(
    "events",
    query,
    { isPreview: true, id: "event-1", version: "draft" },
    execute
  );
  const roundTrip: [typeof app, typeof server, typeof normal, typeof preview] = [
    expected[0] ?? null,
    expected[0] ?? null,
    expected[0] ?? null,
    expected[0] ?? null
  ];
  for (const item of roundTrip) {
    const equivalent: (typeof expected)[number] | null = item;
    if (equivalent) {
      equivalent.audiences?.filter((entry) => entry.audiences_id);
    }
    if (item) {
      item.audiences?.filter((entry) => entry.audiences_id?.slug);
      // @ts-expect-error Unselected event fields must remain unavailable.
      void item.title;
      // @ts-expect-error Unselected audience fields must remain unavailable.
      void item.audiences?.[0]?.audiences_id?.title;
    }
  }
  // @ts-expect-error Lookup results remain nullable.
  const required: (typeof expected)[number] = app;
  return required;
}
void checkInference;
