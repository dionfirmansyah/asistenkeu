import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { validateItemName } from "@/lib/googleDrive";
import { MAX_BULK_FOLDERS, parseFolderNames } from "@/components/drive/drive-utils";

export interface BulkFolderDialogProps {
  folderName: string;
  busy?: boolean;
  onClose: () => void;
  /** Kembalikan pesan error bila gagal; nilai kosong berarti sukses dan dialog ditutup. */
  onSubmit: (names: string[]) => Promise<string | void> | string | void;
}

/**
 * Dialog banyak folder sekaligus: satu nama per baris.
 * Dipasang hanya saat dialog terbuka sehingga isinya selalu segar.
 */
export function BulkFolderDialog({ folderName, busy = false, onClose, onSubmit }: BulkFolderDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const names = parseFolderNames(value);

  const submit = async () => {
    if (names.length === 0) {
      setError("Tulis minimal satu nama folder.");
      return;
    }
    if (names.length > MAX_BULK_FOLDERS) {
      setError(`Maksimal ${MAX_BULK_FOLDERS} folder sekaligus. Kurangi menjadi ${MAX_BULK_FOLDERS} baris.`);
      return;
    }
    for (const name of names) {
      const invalid = validateItemName(name);
      if (invalid) {
        setError(`"${name}": ${invalid}`);
        return;
      }
    }
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) dupes.push(name);
      else seen.add(key);
    }
    if (dupes.length > 0) {
      setError(`Nama kembar di daftar: ${[...new Set(dupes)].slice(0, 3).join(", ")}. Hapus yang ganda.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await onSubmit(names);
      if (result) setError(result);
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat folder. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Banyak folder sekaligus</DialogTitle>
            <DialogDescription>
              {folderName
                ? `Folder dibuat di dalam "${folderName}". Tulis satu nama per baris.`
                : "Tulis satu nama folder per baris."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <label htmlFor="drive-bulk-names" className="text-sm font-medium">
              Nama folder
              <span className="text-destructive"> *</span>
            </label>
            <Textarea
              id="drive-bulk-names"
              autoFocus
              rows={6}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={"Contoh:\nSPJ Januari\nSPJ Februari\nSPJ Maret"}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "drive-bulk-error" : "drive-bulk-hint"}
            />
            <p id="drive-bulk-hint" className="text-xs text-muted-foreground">
              {names.length === 0
                ? `Maksimal ${MAX_BULK_FOLDERS} folder sekaligus.`
                : `${names.length} folder akan dibuat.`}
            </p>
            {error ? (
              <p id="drive-bulk-error" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || busy || names.length === 0}>
              {saving || busy ? "Membuat…" : `Buat ${names.length > 0 ? `${names.length} folder` : "folder"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
