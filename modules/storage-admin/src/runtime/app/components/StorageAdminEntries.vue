<script setup lang="ts">
import type { DropdownMenuItem, TableColumn, TableRow } from "@nuxt/ui";
import { computed, h, onMounted, resolveComponent, shallowRef, watch } from "vue";
import StorageAdminEntriesControls from "./StorageAdminEntriesControls.vue";

interface ConfiguredMount {
  mount: string;
  prefixes: string[];
}

interface StorageEntry {
  key: string;
  path: string | null;
}

interface ListResponse {
  data: {
    items: StorageEntry[];
    page: number | null;
    total: number;
  };
}

const ALL_BASES_VALUE = "__storage_admin_all_bases__";

const configuredMounts = shallowRef<ConfiguredMount[]>([]);
const entries = shallowRef<StorageEntry[]>([]);
const errorMessage = shallowRef<string | null>(null);
const isDeleting = shallowRef(false);
const isLoading = shallowRef(false);
const page = shallowRef(1);
const pageSize = shallowRef(25);
const search = shallowRef("");
const selectedBase = shallowRef(ALL_BASES_VALUE);
const selectedMount = shallowRef("");
const rowSelection = shallowRef<Record<string, boolean>>({});
const contextMenuEntry = shallowRef<StorageEntry | null>(null);
const total = shallowRef(0);
let requestId = 0;

const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const pageSizeOptions = [
  { label: "25 rows", value: 25 },
  { label: "50 rows", value: 50 },
  { label: "100 rows", value: 100 }
];

const baseOptions = computed(() => {
  const prefixes = configuredMounts.value.find(
    (mount) => mount.mount === selectedMount.value
  )?.prefixes;
  return [
    { label: "All bases", value: ALL_BASES_VALUE },
    ...(prefixes ?? []).map((prefix) => ({ label: prefix, value: prefix }))
  ];
});
const mountOptions = computed(() =>
  configuredMounts.value.map(({ mount }) => ({ label: mount, value: mount }))
);
const contextMenuItems = computed(() =>
  contextMenuEntry.value ? storageEntryActions(contextMenuEntry.value.key) : []
);

/**
 * Returns the currently selected mount when the selector contains a value.
 * @returns The selected mount, or null when no mount is selected.
 */
function selectedTarget(): string | null {
  return selectedMount.value || null;
}

/**
 * Returns a stable identity so selections survive table rendering.
 * @param entry The storage entry represented by the table row.
 * @returns The storage key used as the row identity.
 */
function getRowId(entry: StorageEntry): string {
  return entry.key;
}

/**
 * Deletes one or more selected entries after an explicit browser confirmation.
 * @param keys Storage keys within the currently selected mount.
 */
async function deleteEntries(keys: string[]): Promise<void> {
  const target = selectedTarget();
  if (!target || keys.length === 0 || isDeleting.value) return;

  const description = keys.length === 1 ? "this storage entry" : `${keys.length} storage entries`;
  if (!window.confirm(`Delete ${description}? This cannot be undone.`)) return;

  errorMessage.value = null;
  isDeleting.value = true;

  try {
    await Promise.all(
      keys.map((key) =>
        $fetch(`/api/_storage/${target}/items/${encodeURIComponent(key)}`, { method: "DELETE" })
      )
    );
    rowSelection.value = {};
    await loadEntries();
  } catch {
    errorMessage.value = "Unable to delete the selected storage entries.";
  } finally {
    isDeleting.value = false;
  }
}

/**
 * Creates the destructive action shared by the row dropdown and context menu.
 * @param key Storage key to delete.
 * @returns A grouped Nuxt UI menu item list.
 */
function storageEntryActions(key: string): DropdownMenuItem[][] {
  return [
    [
      {
        label: "Delete entry",
        icon: "i-lucide-trash-2",
        color: "error",
        disabled: isDeleting.value,
        onSelect: () => deleteEntries([key])
      }
    ]
  ];
}

/**
 * Selects the entry targeted by the table context-menu event.
 * @param _event Native context-menu event.
 * @param row Table row that received the context-menu event.
 * @returns Nothing.
 */
function handleContextMenu(_event: Event, row: TableRow<StorageEntry>): void {
  contextMenuEntry.value = row.original;
}

const columns = computed<TableColumn<StorageEntry>[]>(() => [
  {
    id: "select",
    meta: {
      class: { th: "w-10 max-w-10 p-0 text-center", td: "w-10 max-w-10 p-0 text-center" },
      style: {
        th: { width: "40px", maxWidth: "40px" },
        td: { width: "40px", maxWidth: "40px" }
      }
    },
    header: ({ table }) =>
      h(UCheckbox, {
        "aria-label": "Select all storage entries on this page",
        modelValue: table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          table.toggleAllPageRowsSelected(value === true)
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        "aria-label": `Select ${row.original.key}`,
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: boolean | "indeterminate") =>
          row.toggleSelected(value === true)
      })
  },
  { accessorKey: "key", header: "Storage key" },
  { accessorKey: "path", header: "Cached path" },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      h(
        UDropdownMenu,
        {
          content: { align: "end" },
          items: storageEntryActions(row.original.key)
        },
        {
          default: () =>
            h(UButton, {
              "aria-label": `Actions for ${row.original.key}`,
              icon: "i-lucide-ellipsis-vertical",
              variant: "ghost"
            })
        }
      )
  }
]);

/** Loads a page of entries and asks the server to include searchable path metadata. */
async function loadEntries(): Promise<void> {
  const target = selectedTarget();
  if (!target) return;

  const currentRequestId = ++requestId;
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const response = await $fetch<ListResponse>(`/api/_storage/${target}/items`, {
      query: {
        prefix: selectedBase.value === ALL_BASES_VALUE ? undefined : selectedBase.value,
        page: page.value,
        limit: pageSize.value,
        metadata: true,
        ...(search.value ? { search: search.value } : {})
      }
    });
    if (currentRequestId !== requestId) return;

    entries.value = response.data.items;
    rowSelection.value = {};
    total.value = response.data.total;
  } catch {
    if (currentRequestId !== requestId) return;
    entries.value = [];
    total.value = 0;
    errorMessage.value = "Unable to load the selected storage prefix.";
  } finally {
    if (currentRequestId === requestId) isLoading.value = false;
  }
}

onMounted(async () => {
  try {
    const response = await $fetch<{ data: { mounts: ConfiguredMount[] } }>("/api/_storage/config");
    configuredMounts.value = response.data.mounts;
    selectedMount.value = mountOptions.value[0]?.value ?? "";
  } catch {
    errorMessage.value = "Unable to load configured storage mounts.";
  }
});

watch(selectedMount, () => {
  selectedBase.value = ALL_BASES_VALUE;
});
watch([selectedMount, selectedBase, search, pageSize], () => {
  page.value = 1;
});
watch([selectedMount, selectedBase, search, pageSize, page], loadEntries);
</script>

<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-default">Storage entries</h1>
      <p class="mt-1 text-muted">
        Available only during development. Search checks storage keys and cache path metadata.
      </p>
    </div>

    <StorageAdminEntriesControls
      v-model:base="selectedBase"
      v-model:mount="selectedMount"
      v-model:search="search"
      :base-options="baseOptions"
      :mount-options="mountOptions"
    />

    <UAlert
      v-if="errorMessage"
      color="error"
      icon="i-lucide-circle-alert"
      :description="errorMessage"
    />

    <UContextMenu :items="contextMenuItems">
      <UTable
        :columns="columns"
        :data="entries"
        :get-row-id="getRowId"
        :loading="isLoading"
        v-model:row-selection="rowSelection"
        empty="No storage entries found."
        @contextmenu="handleContextMenu"
      />
    </UContextMenu>

    <div class="flex items-center justify-between gap-4">
      <USelect
        v-model="pageSize"
        aria-label="Rows per page"
        :items="pageSizeOptions"
        class="w-36"
        size="xl"
      />
      <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
    </div>
  </section>
</template>
