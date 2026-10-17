import type { ReactNode } from "react";

export type StatusTone = "success" | "destructive" | "warning" | "info" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  destructive: "bg-destructive-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

const TONE_SYMBOL: Record<StatusTone, string> = {
  success: "✓",
  destructive: "✕",
  warning: "!",
  info: "i",
  neutral: "–",
};

/** Lencana status: simbol + teks mono kapital, border sewarna teks. Status selalu disertai teks, bukan hanya warna. */
export function StatusBadge({ tone, children, symbol = true }: { tone: StatusTone; children: ReactNode; symbol?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[2px] border border-current px-2 py-0.5 font-mono text-xs font-medium tracking-[0.06em] uppercase ${TONE_CLASS[tone]}`}
    >
      {symbol && <span aria-hidden="true">{TONE_SYMBOL[tone]}</span>}
      {children}
    </span>
  );
}
