import type { ReactNode } from "react";

export type StatusTone = "success" | "destructive" | "warning" | "info" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success-soft text-success",
  destructive: "bg-destructive-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  neutral: "bg-muted text-muted-foreground",
};

/** Pil status dengan titik penanda — status selalu disertai teks, bukan hanya warna. */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[tone]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
