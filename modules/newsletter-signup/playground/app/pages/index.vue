<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";
import * as z from "zod";

const config = useRuntimeConfig();
const toast = useToast();
const { signup, handleSignupError } = useNewsletterSignup();

const schema = z.object({
  email: z.email("Vul een geldig e-mailadres in."),
  firstName: z.string().trim().min(1, "Vul je voornaam in."),
  lastName: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  listId: z.string().min(1, "Kies een nieuwsbrief.")
});

type SignupForm = z.output<typeof schema>;

const configuredLists = config.public.newsletterSignup.lists?.options ?? [];
const listOptions = configuredLists.map((list) => ({ label: list.label, value: list.id }));
const defaultListId = config.public.newsletterSignup.lists?.default ?? listOptions[0]?.value ?? "";

const state = reactive<Partial<SignupForm>>({
  email: "",
  firstName: "",
  lastName: "",
  organization: "",
  listId: defaultListId
});

const loading = ref(false);
const submitted = ref(false);

async function submit(event: FormSubmitEvent<SignupForm>) {
  loading.value = true;
  submitted.value = false;

  try {
    await signup({
      email: event.data.email,
      firstName: event.data.firstName,
      lastName: event.data.lastName || undefined,
      organization: event.data.organization || undefined,
      listId: event.data.listId
    });

    submitted.value = true;
    toast.add({
      title: "Je bent ingeschreven",
      description: "Bedankt voor je inschrijving.",
      color: "success"
    });
  } catch (error: unknown) {
    handleSignupError(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UContainer class="max-w-xl py-12">
    <UCard>
      <template #header>
        <div>
          <h1 class="text-2xl font-semibold">Nieuwsbrief inschrijven</h1>
          <p class="mt-1 text-muted">Playground voor Loops en Mailchimp signup.</p>
        </div>
      </template>

      <UForm :schema="schema" :state="state" class="space-y-5" @submit="submit">
        <UFormField label="E-mailadres" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="naam@voorbeeld.nl"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Voornaam" name="firstName" required>
          <UInput
            v-model="state.firstName"
            placeholder="Ada"
            autocomplete="given-name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Achternaam" name="lastName">
          <UInput
            v-model="state.lastName"
            placeholder="Lovelace"
            autocomplete="family-name"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Organisatie" name="organization">
          <UInput
            v-model="state.organization"
            placeholder="Voorbeeldorganisatie"
            autocomplete="organization"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Nieuwsbrief" name="listId" required>
          <USelect v-model="state.listId" :items="listOptions" class="w-full" />
        </UFormField>

        <UButton type="submit" label="Inschrijven" :loading="loading" block />
      </UForm>

      <UAlert
        v-if="submitted"
        class="mt-5"
        color="success"
        variant="soft"
        title="Inschrijving gelukt"
        description="Je ontvangt de nieuwsbrief volgens de instellingen van de provider."
      />
    </UCard>
  </UContainer>
</template>
