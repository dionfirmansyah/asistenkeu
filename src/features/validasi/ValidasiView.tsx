import { useSmdStore } from "@/stores/smd-store";
import { Badge } from "@/components/ui/badge";

const ORDER = { ERROR: 0, WARNING: 1, INFO: 2, PASS: 3 } as const;
const VARIANT: Record<string, "destructive" | "secondary" | "default" | "outline"> = {
  ERROR: "destructive",
  WARNING: "secondary",
  INFO: "outline",
  PASS: "default",
};

export default function ValidasiView() {
  const { val } = useSmdStore();
  const counts = { ERROR: 0, WARNING: 0, ERROR_: 0, PASS: 0, INFO: 0 };
  for (const v of val) (counts as Record<string, number>)[v.level] += 1;
  const sorted = [...val].sort((a, b) => ORDER[a.level] - ORDER[b.level]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-sm">
        {(["ERROR", "WARNING", "PASS", "INFO"] as const).map((l) => (
          <Badge key={l} variant={VARIANT[l]}>{l} {counts[l]}</Badge>
        ))}
      </div>
      {sorted.map((v, i) => (
        <details key={i} className="rounded-md border px-3 py-2 text-sm">
          <summary className="flex cursor-pointer items-center gap-2">
            <Badge variant={VARIANT[v.level]}>{v.level}</Badge>
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
