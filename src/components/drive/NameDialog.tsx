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
import { Input } from "@/components/ui/input";
import { describeError, validateItemName } from "@/lib/googleDrive";

export interface NameDialogProps {
  title: string;
  description?: string;
  label: string;
  initial?: string;
  submitLabel: string;
  busy?: boolean;
  onClose: () => void;
  /** Kembalikan pesan error bila gagal; nilai kosong berarti sukses. */
  onSubmit: (name: string) => Promise<string | void> | string | void;
}

/**
 * Dialog satu kolom nama (folder baru, file baru, ubah nama).
 * Komponen ini hanya dipasang saat dialog terbuka sehingga isinya selalu segar.
 */
export function NameDialog({
  title,
  description,
  label,
  initial = "",
  submitLabel,
  busy = false,
  onClose,
  onSubmit,
}: NameDialogProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const name = value.trim();
    const invalid = validateItemName(name);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await onSubmit(name);
      if (result) setError(result);
      else onClose();
    } catch (e) {
      setError(describeError(e));
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
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>

          <div className="grid gap-1.5">
            <label htmlFor="drive-name" className="text-sm font-medium">
              {label}
              <span className="text-destructive"> *</span>
            </label>
            <Input
              id="drive-name"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "drive-name-error" : undefined}
            />
            {error ? (
              <p id="drive-name-error" className="text-xs text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || busy}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
