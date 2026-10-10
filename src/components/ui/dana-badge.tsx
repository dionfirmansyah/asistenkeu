/** Lencana sumber dana dengan warna tetap per kode (ADD, DDS, PBH, DLL, PBP). */
const DANA_TONE: Record<string, string> = {
  ADD: "border-blue-500/30 bg-blue-500/15 text-blue-700 dark:text-blue-400",
  DDS: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  PBH: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400",
  DLL: "border-violet-500/30 bg-violet-500/15 text-violet-700 dark:text-violet-400",
  PBP: "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

const UNKNOWN_TONE = "border-border bg-muted text-muted-foreground";

/** Warna isi (fill SVG) selaras dengan nada lencana — untuk chart recharts. */
const DANA_FILL: Record<string, string> = {
  ADD: "#3b82f6",
  DDS: "#10b981",
  PBH: "#f59e0b",
  DLL: "#8b5cf6",
  PBP: "#f43f5e",
};

export const danaFill = (value: unknown): string => {
  const key = String(value ?? "").split(",")[0]?.trim() ?? "";
  return DANA_FILL[key] ?? "#94a3b8";
};

export function DanaBadge({ value, emptyLabel = "Tanpa sumber dana" }: { value: unknown; emptyLabel?: string }) {
  const parts = String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) {
    return (
      <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${UNKNOWN_TONE}`}>
        {emptyLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap gap-1">
      {parts.map((p) => (
        <span
          key={p}
          title={p}
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${DANA_TONE[p] ?? UNKNOWN_TONE}`}
        >
          {p}
        </span>
      ))}
    </span>
  );
}
