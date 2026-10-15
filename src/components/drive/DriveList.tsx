import { Download, Ellipsis, ExternalLink, FileDown, FolderInput, Link2, Pencil, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DriveItem } from "@/lib/googleDrive";
import { formatSize, isFolder, isGoogleNative, isShortcut } from "@/lib/googleDrive";
import { formatModified, itemIcon } from "@/components/drive/drive-utils";
import { FolderEmptyBadge } from "@/components/drive/FolderEmptyBadge";

export interface DriveListActions {
  onOpen: (item: DriveItem) => void;
  onDownload: (item: DriveItem, pdf?: boolean) => void;
  onOpenInDrive: (item: DriveItem) => void;
  onCopyLink: (item: DriveItem) => void;
  onRename: (item: DriveItem) => void;
  onMove: (item: DriveItem) => void;
  onTrash: (item: DriveItem) => void;
}

export interface DriveListProps extends DriveListActions {
  items: DriveItem[];
  /** Item yang sedang diproses agar tombol aksi nonaktif (cegah klik ganda). */
  busyId: string | null;
}

export function RowMenu({
  item,
  busy,
  dense,
  actions,
}: {
  item: DriveItem;
  busy: boolean;
  dense: boolean;
  actions: DriveListActions;
}) {
  const caps = item.capabilities ?? {};
  const folder = isFolder(item);
  const shortcut = isShortcut(item);
  const native = isGoogleNative(item);
  const canRename = caps.canRename !== false;
  const canTrash = caps.canTrash !== false;
  const downloadable = !folder && !shortcut && caps.canDownload !== false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        render={
          <Button
            variant="ghost"
            size={dense ? "icon-sm" : "icon"}
            aria-label={`Aksi untuk ${item.name}`}
            title="Aksi"
          />
        }
      >
        <Ellipsis />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {item.webViewLink && (
          <DropdownMenuItem onClick={() => actions.onOpenInDrive(item)}>
            <ExternalLink />
            Buka di Google Drive
          </DropdownMenuItem>
        )}
        {item.webViewLink && (
          <DropdownMenuItem onClick={() => actions.onCopyLink(item)}>
            <Link2 />
            Salin tautan
          </DropdownMenuItem>
        )}
        {downloadable && (
          <DropdownMenuItem onClick={() => actions.onDownload(item)}>
            <Download />
            Unduh
          </DropdownMenuItem>
        )}
        {downloadable && native && (
          <DropdownMenuItem onClick={() => actions.onDownload(item, true)}>
            <FileDown />
            Unduh sebagai PDF
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={!canRename} onClick={() => actions.onRename(item)}>
          <Pencil />
          Ubah nama
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canRename || !item.parents?.[0]} onClick={() => actions.onMove(item)}>
          <FolderInput />
          Pindah
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={!canTrash} onClick={() => actions.onTrash(item)}>
          <Trash />
          Buang ke Sampah
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NameButton({ item, onOpen }: { item: DriveItem; onOpen: (item: DriveItem) => void }) {
  const Icon = itemIcon(item);
  const kindLabel = isFolder(item)
    ? "Folder"
    : isShortcut(item)
      ? "Pintasan"
      : isGoogleNative(item)
        ? "File Google"
        : "File";
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-2 rounded-sm text-left hover:text-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      onClick={() => onOpen(item)}
      aria-label={`Buka ${kindLabel} ${item.name}`}
      title={item.name}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate font-medium">{item.name}</span>
      {isShortcut(item) && <span className="shrink-0 text-[11px] text-muted-foreground">Pintasan</span>}
    </button>
  );
}

/** Daftar isi folder: tabel di desktop, daftar bertumpuk di layar kecil. */
export function DriveList({ items, busyId, ...actions }: DriveListProps) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-[13px]">
          <thead className="sticky top-0 bg-muted">
            <tr className="border-b">
              <th scope="col" className="h-10 px-3 text-left font-semibold">
                Nama
              </th>
              <th scope="col" className="h-10 px-3 text-right font-semibold">
                Ukuran
              </th>
              <th scope="col" className="h-10 px-3 text-left font-semibold">
                Terakhir diubah
              </th>
              <th scope="col" className="h-10 px-3 text-right font-semibold">
                <span className="sr-only">Aksi</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const busy = busyId === item.id;
              return (
                <tr
                  key={item.id}
                  className={`border-b last:border-0 hover:bg-primary/5 ${busy ? "opacity-60" : ""}`}
                  aria-busy={busy || undefined}
                >
                  <td className="h-11 max-w-[28rem] px-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <NameButton item={item} onOpen={actions.onOpen} />
                      </div>
                      {isFolder(item) && <FolderEmptyBadge folderId={item.id} />}
                    </div>
                  </td>
                  <td className="h-11 px-3 text-right tabular-nums text-muted-foreground">
                    {formatSize(item.size)}
                  </td>
                  <td className="h-11 px-3 whitespace-nowrap text-muted-foreground">
                    {formatModified(item.modifiedTime)}
                  </td>
                  <td className="h-11 px-3">
                    <div className="flex justify-end">
                      <RowMenu item={item} busy={busy} dense actions={actions} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="divide-y rounded-lg border md:hidden">
        {items.map((item) => {
          const busy = busyId === item.id;
          return (
            <li key={item.id} className={`flex items-center gap-2 p-3 ${busy ? "opacity-60" : ""}`} aria-busy={busy || undefined}>
              <div className="min-w-0 flex-1">
                <NameButton item={item} onOpen={actions.onOpen} />
                <div className="mt-0.5 flex items-center gap-1.5 pl-6 text-xs text-muted-foreground">
                  <span className="truncate">{formatModified(item.modifiedTime)}</span>
                  {isFolder(item) && <FolderEmptyBadge folderId={item.id} />}
                </div>
              </div>
              {!isFolder(item) && (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatSize(item.size)}</span>
              )}
              <RowMenu item={item} busy={busy} dense={false} actions={actions} />
            </li>
          );
        })}
      </ul>
    </>
  );
}
