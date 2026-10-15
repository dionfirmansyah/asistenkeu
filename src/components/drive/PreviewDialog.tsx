import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
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
import { describeError, downloadFile, isAuthError } from "@/lib/googleDrive";
import { isPreviewable, itemIcon, openInDrive } from "@/components/drive/drive-utils";

export interface PreviewDialogProps {
  item: DriveItem;
  busy: boolean;
  onClose: () => void;
  onDownload: (item: DriveItem) => void;
  onSessionExpired: () => void;
}

/** Pratinjau gambar dan PDF (FR-11); jenis lain cukup dibuka di Google Drive. */
export function PreviewDialog({ item, busy, onClose, onDownload, onSessionExpired }: PreviewDialogProps) {
  const previewable = isPreviewable(item);
  const image = previewable && item.mimeType.startsWith("image/");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(previewable);
  const [error, setError] = useState<string | null>(null);
  const Icon = itemIcon(item);

  useEffect(() => {
    if (!previewable) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setLoading(true);
    setError(null);
    downloadFile(item.id).then(
      (blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setLoading(false);
      },
      (e: unknown) => {
        if (cancelled) return;
        setLoading(false);
        setError(describeError(e));
        if (isAuthError(e)) onSessionExpired();
      },
    );
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.id, previewable, onSessionExpired]);

  const canDownload = item.capabilities?.canDownload !== false;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="break-words">{item.name}</DialogTitle>
          <DialogDescription>
            {previewable ? "Pratinjau berkas." : "Pratinjau tidak tersedia untuk jenis berkas ini."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-40 place-items-center overflow-auto rounded-md border bg-muted/40 p-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Memuat pratinjau…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : url && image ? (
            <img src={url} alt={item.name} className="max-h-[65vh] w-auto rounded-sm" />
          ) : url ? (
            <iframe src={url} title={item.name} className="h-[65vh] w-full rounded-sm bg-white" />
          ) : !previewable ? (
            <div className="grid place-items-center gap-2 text-center">
              <Icon className="size-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">
                Jenis berkas ini tidak bisa ditampilkan di sini. Buka langsung di Google Drive untuk melihat isinya.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
          {canDownload ? (
            <Button type="button" variant="outline" onClick={() => onDownload(item)} disabled={busy}>
              <Download />
              Unduh
            </Button>
          ) : null}
          {item.webViewLink ? (
            <Button type="button" onClick={() => openInDrive(item)}>
              <ExternalLink />
              Buka di Google Drive
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
