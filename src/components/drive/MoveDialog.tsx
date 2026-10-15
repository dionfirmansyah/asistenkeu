import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DriveItem } from "@/lib/googleDrive";
import { describeError, isAuthError, isFolder, listChildren } from "@/lib/googleDrive";

export interface MoveDialogProps {
  /** Folder root terverifikasi — pemilihan tujuan selalu dimulai dari sini. */
  root: DriveItem;
  item: DriveItem;
  busy: boolean;
  onClose: () => void;
  onMove: (item: DriveItem, newParentId: string) => void;
  onSessionExpired: () => void;
}

/**
 * Pemilih folder tujuan (FR-9). Tujuan hanya bisa di bawah root,
 * dan folder tidak bisa dipindahkan ke dalam dirinya sendiri.
 */
export function MoveDialog({ root, item, busy, onClose, onMove, onSessionExpired }: MoveDialogProps) {
  const [pickPath, setPickPath] = useState<DriveItem[]>([]);
  const [folders, setFolders] = useState<DriveItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const expiredRef = useRef(onSessionExpired);
  useEffect(() => {
    expiredRef.current = onSessionExpired;
  });

  const load = useCallback((folderId: string) => {
    setFolders(null);
    setError(null);
    void listChildren(folderId).then(
      (children) => setFolders(children.filter(isFolder)),
      (e: unknown) => {
        setError(describeError(e));
        if (isAuthError(e)) expiredRef.current();
      },
    );
  }, []);

  useEffect(() => {
    setPickPath([root]);
    load(root.id);
  }, [root, load]);

  const current = pickPath.length > 0 ? pickPath[pickPath.length - 1] : null;
  const isSelf = current?.id === item.id;
  const sameParent = current?.id === item.parents?.[0];
  const canSubmit = !!current && !isSelf && !sameParent && !error;

  const enter = (folder: DriveItem) => {
    if (folder.id === item.id) return;
    setPickPath((prev) => [...prev, folder]);
    load(folder.id);
  };

  const goTo = (index: number) => {
    const next = pickPath.slice(0, index + 1);
    const target = next[next.length - 1];
    if (!target) return;
    setPickPath(next);
    load(target.id);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pindahkan "{item.name}"</DialogTitle>
          <DialogDescription>
            Pilih folder tujuan di dalam folder root. Klik folder untuk membuka isinya, lalu tekan Pindahkan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <nav aria-label="Folder tujuan" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {pickPath.map((folder, index) => {
              const last = index === pickPath.length - 1;
              return (
                <span key={folder.id} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="size-3" aria-hidden />}
                  {last ? (
                    <span aria-current="page" className="max-w-[14rem] truncate font-medium text-foreground">
                      {folder.name}
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="max-w-[14rem] truncate hover:text-foreground"
                      onClick={() => goTo(index)}
                    >
                      {folder.name}
                    </button>
                  )}
                </span>
              );
            })}
          </nav>

          {folders === null ? (
            <p className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              Memuat folder…
            </p>
          ) : error ? (
            <p className="rounded-md border border-destructive bg-destructive-soft px-3 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : folders.length === 0 ? (
            <p className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
              Tidak ada folder di sini.
            </p>
          ) : (
            <ul className="max-h-64 divide-y overflow-y-auto rounded-md border">
              {folders.map((folder) => {
                const blocked = folder.id === item.id;
                return (
                  <li key={folder.id}>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => enter(folder)}
                      disabled={blocked}
                      aria-label={`Buka folder ${folder.name}`}
                      title={blocked ? "Folder ini sedang dipindah" : folder.name}
                    >
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <p className="text-xs text-muted-foreground">
            {isSelf
              ? "Folder tidak bisa dipindahkan ke dalam dirinya sendiri."
              : sameParent
                ? "Item sudah berada di folder ini."
                : `Folder tujuan: ${current?.name ?? "—"}`}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || busy}
            onClick={() => current && onMove(item, current.id)}
          >
            Pindahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
