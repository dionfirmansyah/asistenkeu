import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Label tombol utama. Default "Ya" (konfirmasi) atau "Mengerti" (info). */
  confirmLabel?: string;
  /** Label tombol batal. Default "Batal". */
  cancelLabel?: string;
  /** "destructive" untuk aksi hapus. */
  tone?: "default" | "destructive";
}

type Pending = (ConfirmOptions & { info: boolean }) | null;

/**
 * Pengganti promise untuk window.confirm / window.alert berbasis
 * AlertDialog shadcn. Render `{confirmNode}` sekali di komponen pemilik.
 *
 * const { confirmNode, confirm, notify } = useConfirm();
 * if (!(await confirm({ title: "Hapus RPD?", tone: "destructive", confirmLabel: "Hapus" }))) return;
 * await notify({ title: "Berhasil", description: "..." });
 */
export function useConfirm() {
  const [state, setState] = useState<Pending>(null);
  const resolveRef = useRef<(v: boolean) => void>(() => {});

  const ask = useCallback(
    (opts: ConfirmOptions & { info: boolean }) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState(opts);
      }),
    [],
  );

  const close = useCallback((v: boolean) => {
    setState(null);
    resolveRef.current(v);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => ask({ ...opts, info: false }), [ask]);
  const notify = useCallback((opts: ConfirmOptions) => ask({ ...opts, info: true }), [ask]);

  const confirmNode = state ? (
    <AlertDialog open onOpenChange={(o) => { if (!o) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          {state.description ? (
            <AlertDialogDescription className="whitespace-pre-line">{state.description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          {state.info ? null : (
            <AlertDialogCancel onClick={() => close(false)}>
              {state.cancelLabel ?? "Batal"}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            variant={state.tone === "destructive" ? "destructive" : "default"}
            onClick={() => close(true)}
          >
            {state.confirmLabel ?? (state.info ? "Mengerti" : "Ya")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ) : null;

  return { confirmNode, confirm, notify };
}
