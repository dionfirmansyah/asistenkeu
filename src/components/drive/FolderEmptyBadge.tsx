import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { peekCachedChildren, resolveFolderTree, type FolderTreeState } from "@/hooks/useDriveFolder";

type BadgeState = "loading" | FolderTreeState | "error";

/**
 * Keterangan isi folder: "Kosong" bila tanpa isi, "Berisi folder kosong" bila
 * hanya berisi folder-folder kosong (periksa di hook). Pengecekan malas per
 * baris yang tampil (cache sesi + dedup request); gagal cek tidak menampilkan
 * apa pun.
 */
export function FolderEmptyBadge({ folderId }: { folderId: string }) {
  const [state, setState] = useState<BadgeState>("loading");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    void resolveFolderTree(folderId, peekCachedChildren(folderId)).then(
      (tree) => {
        if (!cancelled) setState(tree);
      },
      (e: unknown) => {
        if (cancelled) return;
        console.warn(`Gagal memeriksa isi folder ${folderId}.`, e);
        setState("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [folderId]);

  if (state === "empty") return <StatusBadge tone="neutral">Kosong</StatusBadge>;
  if (state === "only-empty-folders") return <StatusBadge tone="neutral">Berisi folder kosong</StatusBadge>;
  if (state === "loading") {
    return (
      <span role="status" className="shrink-0 text-xs text-muted-foreground">
        Memeriksa…
      </span>
    );
  }
  return null;
}
