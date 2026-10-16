import type { DriveItem } from "@/lib/googleDrive";
import { formatSize, isFolder } from "@/lib/googleDrive";
import { formatModified, itemIcon } from "@/components/drive/drive-utils";
import { FolderEmptyBadge } from "@/components/drive/FolderEmptyBadge";
import { RowMenu, type DriveListActions } from "@/components/drive/DriveList";

export interface DriveGridProps extends DriveListActions {
  items: DriveItem[];
  /** Item yang sedang diproses agar tombol aksi nonaktif (cegah klik ganda). */
  busyId: string | null;
}

function metaText(item: DriveItem): string {
  if (isFolder(item)) return "Folder";
  const size = formatSize(item.size);
  const modified = formatModified(item.modifiedTime);
  return size === "—" ? modified : `${size} · ${modified}`;
}

/** Tampilan grid: kartu per item dengan menu aksi yang sama seperti daftar. */
export function DriveGrid({ items, busyId, ...actions }: DriveGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => {
        const busy = busyId === item.id;
        const Icon = itemIcon(item);
        return (
          <li
            key={item.id}
            aria-busy={busy || undefined}
            className={`group relative flex flex-col gap-2 rounded-none border-2 bg-card p-3 hover:border-primary/40 ${busy ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex size-10 items-center justify-center rounded-sm bg-info-soft text-primary">
                <Icon className="size-5" />
              </span>
              {/* Di atas lapisan klik agar menu tetap bisa dibuka sendiri. */}
              <div className="relative z-20">
                <RowMenu item={item} busy={busy} dense actions={actions} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => actions.onOpen(item)}
              title={item.name}
              aria-label={`Buka ${item.name}`}
              className="min-w-0 rounded-sm text-left focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              {/* Lapisan klik seluas kartu (di bawah menu, di atas isi lain). */}
              <span aria-hidden="true" className="absolute inset-0 z-10 cursor-pointer" />
              <span className="block truncate text-sm font-medium group-hover:text-primary">{item.name}</span>
              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                <span className="truncate">{metaText(item)}</span>
                {isFolder(item) && <FolderEmptyBadge folderId={item.id} />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
