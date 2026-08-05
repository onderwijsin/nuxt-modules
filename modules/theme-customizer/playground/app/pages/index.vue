<script lang="ts" setup>
const activiteiten = [
  { titel: "Nieuwe huisstijl", status: "Klaar", kleur: "success" as const },
  { titel: "Pagina controleren", status: "Bezig", kleur: "warning" as const },
  { titel: "Feedback verzamelen", status: "Gepland", kleur: "neutral" as const }
];
</script>

<template>
  <div>
    <UPageHeader
      title="Een thema dat bij je past"
      description="Gebruik de kleurkiezer rechtsboven om direct te zien hoe Nuxt UI-componenten reageren op een ander thema."
    />

    <div class="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-muted">Projectoverzicht</p>
              <h2 class="text-xl font-semibold text-highlighted">Welkom terug, Sam</h2>
            </div>
            <UBadge color="primary" variant="soft">Actief</UBadge>
          </div>
        </template>

        <div class="space-y-5">
          <UProgress :model-value="72" color="primary" />
          <div class="flex flex-wrap gap-3">
            <UButton label="Project openen" icon="i-lucide-arrow-right" trailing />
            <UButton label="Voorbeeld bekijken" color="neutral" variant="outline" />
          </div>
          <UAlert
            title="Thema succesvol geladen"
            description="Alle kleurrollen, randen en componentstijlen gebruiken nu de actieve selectie."
            icon="i-lucide-check-circle-2"
            color="success"
            variant="soft"
          />
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold text-highlighted">Snelle instellingen</h2>
        </template>
        <div class="space-y-4">
          <UFormField label="Naam van het project">
            <UInput model-value="Thema Studio" icon="i-lucide-pencil" />
          </UFormField>
          <UFormField label="Weergave">
            <USelect
              :items="['Lichte weergave', 'Donkere weergave', 'Systeemvoorkeur']"
              model-value="Lichte weergave"
              class="w-full"
            />
          </UFormField>
          <USwitch label="Meldingen inschakelen" :default-value="true" />
        </div>
      </UCard>
    </div>

    <UCard class="mt-6 overflow-hidden ring-1 ring-accent-500/40">
      <div class="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p class="text-sm font-semibold text-accent-600 dark:text-accent-400">Accentkleur</p>
          <h2 class="mt-1 text-xl font-semibold text-highlighted">Een accent dat opvalt</h2>
          <p class="mt-2 max-w-2xl text-muted">
            Dit Nuxt UI-voorbeeld gebruikt rechtstreeks de actieve accentkleuren uit de
            theme-customizer.
          </p>
        </div>
        <UButton label="Accentactie" icon="i-lucide-sparkles" color="accent" />
      </div>
    </UCard>

    <UCard class="mt-6">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold text-highlighted">Recente activiteiten</h2>
          <UButton label="Alles bekijken" color="neutral" variant="ghost" size="sm" />
        </div>
      </template>
      <UTable
        :data="activiteiten"
        :columns="[
          { accessorKey: 'titel', header: 'Activiteit' },
          { accessorKey: 'status', header: 'Status' }
        ]"
      >
        <template #status-cell="{ row }">
          <UBadge :color="row.original.kleur" variant="subtle">{{ row.original.status }}</UBadge>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
