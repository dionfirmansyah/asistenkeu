import { useSmdStore } from "@/stores/smd-store";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";

const ORDER = { ERROR: 0, WARNING: 1, INFO: 2, PASS: 3 } as const;
const TONE: Record<string, StatusTone> = {
  ERROR: "destructive",
  WARNING: "warning",
  INFO: "info",
  PASS: "success",
};
const LABEL: Record<string, string> = {
  ERROR: "Galat",
  WARNING: "Peringatan",
  INFO: "Info",
  PASS: "Sesuai",
};

export default function ValidasiView() {
  const { val } = useSmdStore();
  const counts = { ERROR: 0, WARNING: 0, ERROR_: 0, PASS: 0, INFO: 0 };
  for (const v of val) (counts as Record<string, number>)[v.level] += 1;
  const sorted = [...val].sort((a, b) => ORDER[a.level] - ORDER[b.level]);

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Validasi data</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Pemeriksaan konsistensi data Siskeudes.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        {(["ERROR", "WARNING", "PASS", "INFO"] as const).map((l) => (
          <StatusBadge key={l} tone={TONE[l]}>{LABEL[l]} {counts[l]}</StatusBadge>
        ))}
      </div>
      {sorted.map((v, i) => (
        <details key={i} className="rounded-none border-2 bg-card px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2">
            <StatusBadge tone={TONE[v.level]}>{LABEL[v.level]}</StatusBadge>
            <span className="text-xs text-muted-foreground">{v.group}</span>
            <span>{v.text}</span>
          </summary>
          {v.detail.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {v.detail.map((d, j) => <li key={j}>{d}</li>)}
            </ul>
          )}
        </details>
      ))}
    </div>
  );
}
