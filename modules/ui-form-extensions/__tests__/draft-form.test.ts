import { nextTick, ref } from "vue";
import type { Ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useDraftForm } from "../src/runtime/app/composables/draft-form";

interface ProfileDraft {
  name: string;
  address: { city: string };
  tags?: string[];
  birthday?: Date;
  company?: string;
}

function createForm(source: Ref<ProfileDraft>) {
  return useDraftForm<ProfileDraft, ProfileDraft>({
    getSource: () => source.value,
    save: vi.fn(async () => undefined),
    onError: vi.fn()
  });
}

describe("useDraftForm", () => {
  it("clones the source and reports nested edits as dirty", () => {
    const source = ref<ProfileDraft>({ name: "Ada", address: { city: "London" } });
    const form = createForm(source);

    expect(form.state).toEqual(source.value);
    expect(form.state).not.toBe(source.value);
    expect(form.state.address).not.toBe(source.value.address);
    expect(form.isDirty.value).toBe(false);

    form.state.address.city = "Paris";

    expect(source.value.address.city).toBe("London");
    expect(form.isDirty.value).toBe(true);
  });

  it("follows source changes while the draft is clean", async () => {
    const source = ref<ProfileDraft>({ name: "Ada", address: { city: "London" } });
    const form = createForm(source);

    source.value = { name: "Grace", address: { city: "New York" } };
    await nextTick();

    expect(form.state).toEqual(source.value);
    expect(form.isDirty.value).toBe(false);
  });

  it("starts clean and remains comparable with arrays and dates", () => {
    const source = ref<ProfileDraft>({
      name: "Ada",
      address: { city: "London" },
      tags: ["math", "code"],
      birthday: new Date("1815-12-10T00:00:00.000Z")
    });
    const form = createForm(source);

    expect(form.isDirty.value).toBe(false);
    form.state.tags?.push("science");
    expect(form.isDirty.value).toBe(true);
  });

  it("removes draft properties no longer present in the canonical source", async () => {
    const source = ref<ProfileDraft>({
      name: "Ada",
      address: { city: "London" },
      company: "Analytical Engines"
    });
    const form = createForm(source);

    source.value = { name: "Ada", address: { city: "London" } };
    await nextTick();

    expect(form.state).not.toHaveProperty("company");
  });

  it("does not overwrite a dirty draft when the source changes", async () => {
    const source = ref<ProfileDraft>({ name: "Ada", address: { city: "London" } });
    const form = createForm(source);

    form.state.name = "Local edit";
    source.value = { name: "Grace", address: { city: "New York" } };
    await nextTick();

    expect(form.state.name).toBe("Local edit");
    expect(form.isDirty.value).toBe(true);
  });

  it("resets after a successful save", async () => {
    const source = ref<ProfileDraft>({ name: "Ada", address: { city: "London" } });
    const save = vi.fn(async () => undefined);
    const form = useDraftForm({
      getSource: () => source.value,
      save,
      onError: vi.fn()
    });

    form.state.name = "Updated";
    await form.submit({ name: "Updated", address: { city: "London" } });

    expect(save).toHaveBeenCalledOnce();
    expect(form.state).toEqual(source.value);
    expect(form.isDirty.value).toBe(false);
    expect(form.saving.value).toBe(false);
  });

  it("keeps the draft and reports failed saves", async () => {
    const source = ref<ProfileDraft>({ name: "Ada", address: { city: "London" } });
    const onError = vi.fn();
    const form = useDraftForm({
      getSource: () => source.value,
      save: vi.fn(async () => {
        throw new Error("failed");
      }),
      onError
    });

    form.state.name = "Unsent";
    await form.submit({ name: "Unsent", address: { city: "London" } });

    expect(onError).toHaveBeenCalledOnce();
    expect(form.state.name).toBe("Unsent");
    expect(form.isDirty.value).toBe(true);
    expect(form.saving.value).toBe(false);
  });
});
