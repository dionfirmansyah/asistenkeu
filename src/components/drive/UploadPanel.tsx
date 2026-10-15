import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import type { UploadTask } from "@/hooks/useUploadQueue";
import { formatSize } from "@/lib/googleDrive";

export interface UploadPanelProps {
  tasks: UploadTask[];
  onCancel: (id: string) => void;
  onCancelAll: () => void;
  onClear: () => void;
}

function Status({ task }: { task: UploadTask }) {
  switch (task.status) {
    case "queued":
      return <StatusBadge tone="neutral">Menunggu</StatusBadge>;
    case "uploading":
      return <StatusBadge tone="info">Mengunggah {task.progress}%</StatusBadge>;
    case "done":
      return <StatusBadge tone="success">Terunggah</StatusBadge>;
    case "canceled":
      return <StatusBadge tone="neutral">Dibatalkan</StatusBadge>;
    case "error":
      return <StatusBadge tone="destructive">Gagal</StatusBadge>;
  }
}

/** Panel progres antrean unggahan (FR-4). */
export function UploadPanel({ tasks, onCancel, onCancelAll, onClear }: UploadPanelProps) {
  if (tasks.length === 0) return null;
  const running = tasks.some((t) => t.status === "queued" || t.status === "uploading");

  return (
    <section className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="text-base font-semibold">Unggahan</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelAll} disabled={!running}>
            Batalkan semua
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={running}>
            Bersihkan
          </Button>
        </div>
      </div>
      <ul className="divide-y">
        {tasks.map((task) => (
          <li key={task.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={task.file.name}>
                {task.file.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{formatSize(task.file.size)}</span>
              <Status task={task} />
              {task.status === "queued" || task.status === "uploading" ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Batalkan unggahan ${task.file.name}`}
                  title="Batalkan"
                  onClick={() => onCancel(task.id)}
                >
                  <X />
                </Button>
              ) : null}
            </div>
            {task.status === "uploading" ? (
              <Progress value={task.progress} className="mt-2" aria-label={`Progres ${task.file.name}`} />
            ) : null}
            {task.status === "error" && task.message ? (
              <p className="mt-1 text-xs text-destructive">{task.message}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
