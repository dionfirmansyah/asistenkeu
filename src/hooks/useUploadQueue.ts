import { useCallback, useEffect, useRef, useState } from "react";
import type { DriveItem } from "@/lib/googleDrive";
import { describeError, DriveError, isAuthError, MAX_UPLOAD_SIZE, uploadFile } from "@/lib/googleDrive";

export type UploadStatus = "queued" | "uploading" | "done" | "error" | "canceled";

export interface UploadTask {
  id: string;
  file: File;
  /** Folder tujuan pada saat file dimasukkan ke antrean. */
  folderId: string;
  status: UploadStatus;
  /** 0–100 */
  progress: number;
  message?: string;
}

export interface UseUploadQueueOptions {
  /** Folder tujuan; `null` bila belum ada folder aktif. */
  folderId: string | null;
  onUploaded: (item: DriveItem) => void;
  onSessionExpired: () => void;
}

export interface UploadQueueApi {
  tasks: UploadTask[];
  running: boolean;
  /** Mengembalikan jumlah ditolak (ukuran melebihi batas) beserta namanya. */
  enqueue: (files: FileList | File[] | null | undefined) => { accepted: number; rejected: string[] };
  cancel: (id: string) => void;
  cancelAll: () => void;
  clearFinished: () => void;
}

/** Maksimal unggahan bersamaan (PRD FR-4). */
export const MAX_CONCURRENT_UPLOADS = 2;

function taskId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `u-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Antrean unggahan: progres per file, batas 2 bersamaan, batal lewat AbortController. */
export function useUploadQueue(options: UseUploadQueueOptions): UploadQueueApi {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const controllers = useRef(new Map<string, AbortController>());
  const started = useRef(new Set<string>());
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const update = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const enqueue = useCallback((files: FileList | File[] | null | undefined) => {
    const target = optionsRef.current.folderId;
    const picked = Array.from(files ?? []);
    if (!target) return { accepted: 0, rejected: [] };
    const accepted: UploadTask[] = [];
    const rejected: string[] = [];
    for (const file of picked) {
      if (file.size > MAX_UPLOAD_SIZE) rejected.push(file.name);
      else accepted.push({ id: taskId(), file, folderId: target, status: "queued", progress: 0 });
    }
    if (accepted.length > 0) setTasks((list) => [...list, ...accepted]);
    return { accepted: accepted.length, rejected };
  }, []);

  const cancel = useCallback((id: string) => {
    const controller = controllers.current.get(id);
    if (controller) {
      controller.abort();
      return;
    }
    setTasks((list) => list.map((t) => (t.id === id && t.status === "queued" ? { ...t, status: "canceled" } : t)));
  }, []);

  const clearFinished = useCallback(() => {
    setTasks((list) => list.filter((t) => t.status === "queued" || t.status === "uploading"));
  }, []);

  const cancelAll = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort();
    setTasks((list) => list.map((t) => (t.status === "queued" ? { ...t, status: "canceled" } : t)));
  }, []);

  // Jalankan antrean: maksimal MAX_CONCURRENT_UPLOADS unggahan aktif.
  useEffect(() => {
    for (const task of tasks) {
      if (controllers.current.size >= MAX_CONCURRENT_UPLOADS) break;
      if (task.status !== "queued" || started.current.has(task.id)) continue;
      started.current.add(task.id);
      const controller = new AbortController();
      controllers.current.set(task.id, controller);
      update(task.id, { status: "uploading", progress: 0 });

      void uploadFile(task.folderId, task.file, {
        signal: controller.signal,
        onProgress: (ratio) => update(task.id, { progress: Math.round(ratio * 100) }),
      }).then(
        (item) => {
          controllers.current.delete(task.id);
          update(task.id, { status: "done", progress: 100 });
          optionsRef.current.onUploaded(item);
        },
        (e: unknown) => {
          controllers.current.delete(task.id);
          const aborted = e instanceof DriveError && e.reason === "aborted";
          if (aborted) {
            update(task.id, { status: "canceled" });
            return;
          }
          if (isAuthError(e)) optionsRef.current.onSessionExpired();
          update(task.id, { status: "error", message: describeError(e) });
        },
      );
    }
  }, [tasks, update]);

  const running = tasks.some((t) => t.status === "queued" || t.status === "uploading");

  return { tasks, running, enqueue, cancel, cancelAll, clearFinished };
}
