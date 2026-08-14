<script setup lang="ts">
import { getPaginationRowModel } from "@tanstack/vue-table";
import type { TableColumn } from "@nuxt/ui";

type RouteRow = { path: string };

const search = ref("");
const table = useTemplateRef("table");
const pagination = ref({ pageIndex: 0, pageSize: 6 });
const pageSizeOptions = [
  { label: "5 rows", value: 5 },
  { label: "10 rows", value: 10 },
  { label: "25 rows", value: 25 },
  { label: "50 rows", value: 50 },
  { label: "100 rows", value: 100 }
];
const { data: routes, error, status } = await useFetch<string[]>("/api/prerender-routes");
const columns: TableColumn<RouteRow>[] = [{ accessorKey: "path", header: "Route" }];

const filteredRoutes = computed(() => {
  const query = search.value.trim().toLowerCase();
  const rows = (routes.value ?? []).map((path) => ({ path }));
  return query ? rows.filter((route) => route.path.toLowerCase().includes(query)) : rows;
});

const isEmpty = computed(
  () => !error.value && status.value === "pending" && !(routes.value ?? []).length
);
const emptyLabel = computed(() =>
  search.value.trim()
    ? `No prerender routes match your search for "${search.value.trim()}"`
    : "No prerender routes available. Make sure to build the playground and run in production mode."
);
</script>

<template>
  <div class="space-y-8">
    <UPageHeader
      title="Directus prerenderer"
      description="Inspect the routes supplied to Nuxt's prerender pipeline by Directus collection configuration."
    >
      <template #headline>
        <UBadge color="success" variant="subtle" icon="i-lucide-route">
          {{ routes?.length ?? 0 }} routes discovered
        </UBadge>
      </template>
    </UPageHeader>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold text-highlighted">Prerender route manifest</h2>
            <p class="mt-1 text-sm text-muted">
              Search the deduplicated route list generated during module setup.
            </p>
          </div>
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search routes..."
            aria-label="Search prerender routes"
            class="w-full sm:w-72"
          />
        </div>
      </template>

      <UAlert
        v-if="error"
        class="mb-4"
        title="Unable to load build-time routes"
        description="The route manifest is only available after the prerenderer has completed setup."
        color="warning"
        icon="i-lucide-circle-alert"
      />

      <UTable
        ref="table"
        v-model:pagination="pagination"
        :data="filteredRoutes"
        :columns="columns"
        :loading="status === 'pending' || status === 'idle'"
        :pagination-options="{ getPaginationRowModel: getPaginationRowModel() }"
      >
        <template #path-cell="{ row }">
          <code class="text-sm text-highlighted">{{ row.original.path }}</code>
        </template>
        <template #empty>
          <UEmpty v-if="isEmpty" icon="lucide:inbox">
            <div class="py-8 text-center text-sm text-muted">{{ emptyLabel }}</div>
          </UEmpty>
        </template>
      </UTable>

      <div class="flex justify-end border-t border-default p-4">
        <USelect
          v-model="pagination.pageSize"
          aria-label="Rows per page"
          :items="pageSizeOptions"
          class="mr-4 w-32"
        />
        <UPagination
          :page="(table?.tableApi?.getState().pagination.pageIndex ?? 0) + 1"
          :items-per-page="table?.tableApi?.getState().pagination.pageSize ?? pagination.pageSize"
          :total="table?.tableApi?.getFilteredRowModel().rows.length ?? filteredRoutes.length"
          @update:page="(page) => table?.tableApi?.setPageIndex(page - 1)"
        />
      </div>
    </UCard>
  </div>
</template>
