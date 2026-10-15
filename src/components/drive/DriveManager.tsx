import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Cloud, LayoutGrid, LayoutList, LoaderCircle, SearchX, TriangleAlert, Upload, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DriveItem, GoogleDocKind } from "@/lib/googleDrive";
import { describeError, isAuthError, isFolder, isShortcut } from "@/lib/googleDrive";
import { useConfirm } from "@/hooks/use-confirm";
import { useDriveAuth } from "@/hooks/useDriveAuth";
import { useDriveFolder } from "@/hooks/useDriveFolder";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { DriveBreadcrumb } from "@/components/drive/DriveBreadcrumb";
import { DriveGrid } from "@/components/drive/DriveGrid";
import { DriveList } from "@/components/drive/DriveList";
import { DriveToolbar } from "@/components/drive/DriveToolbar";
import { MoveDialog } from "@/components/drive/MoveDialog";
import { NameDialog } from "@/components/drive/NameDialog";
import { PreviewDialog } from "@/components/drive/PreviewDialog";
import { UploadPanel } from "@/components/drive/UploadPanel";
import { BulkFolderDialog } from "@/components/drive/BulkFolderDialog";
import { buildDriveLinkExcelDoc } from "@/components/drive/excel";
import { copyTextToClipboard, downloadDriveItem, openInDrive } from "@/components/drive/drive-utils";
import { download } from "@/lib/csv";

type DialogState =
  | { kind: "new-folder" }
  | { kind: "new-folders" }
  | { kind: "new-file"; fileKind: GoogleDocKind }
  | { kind: "rename"; item: DriveItem }
  | { kind: "move"; item: DriveItem }
  | { kind: "preview"; item: DriveItem }
  | null;

const FILE_LABEL: Record<GoogleDocKind, string> = {
  document: "Google Docs",
  spreadsheet: "Google Sheets",
  presentation: "Google Slides",
};

type DriveViewMode = "list" | "grid";

const VIEW_KEY = "drive-view-mode";

function readViewMode(): DriveViewMode {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

/** Pengelola folder Google Drive: telusuri, unggah, ubah, buang, pindah. */
export default function DriveManager() {
  const auth = useDriveAuth();
  const folder = useDriveFolder({ root: auth.root, onSessionExpired: auth.markExpired });
  const upload = useUploadQueue({
    folderId: folder.current?.id ?? null,
    onUploaded: (item) => {
      folder.insertItem(item);
      toast.success(`"${item.name}" diunggah.`);
    },
    onSessionExpired: auth.markExpired,
  });
  const { confirm, confirmNode } = useConfirm();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<DriveViewMode>(readViewMode);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refreshRef = useRef(folder.refresh);

  useEffect(() => {
    refreshRef.current = folder.refresh;
  });

  // P2: muat ulang isi folder saat tab kembali aktif.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible" && auth.status === "connected") refreshRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [auth.status]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const current = folder.current;
  const connected = auth.status === "connected";
  const canAdd = connected && !!current && current.capabilities?.canAddChildren !== false;

  // ---- aksi ----

  const handleOpen = (item: DriveItem) => {
    if (isShortcut(item)) {
      openInDrive(item);
      return;
    }
    if (isFolder(item)) {
      folder.openFolder(item);
      return;
    }
    setDialog({ kind: "preview", item });
  };

  const handleDownload = async (item: DriveItem, pdf?: boolean) => {
    setBusyId(item.id);
    try {
      await downloadDriveItem(item, { pdf });
      toast.success(`"${item.name}" diunduh.`);
    } catch (e) {
      toast.error(describeError(e));
      if (isAuthError(e)) auth.markExpired();
    } finally {
      setBusyId(null);
    }
  };

  const handleTrash = async (item: DriveItem) => {
    const confirmed = await confirm({
      title: `Buang "${item.name}" ke Sampah?`,
      description: isFolder(item)
        ? "Folder beserta seluruh isinya ikut terbuang. Item masih bisa dipulihkan dari Sampah di Google Drive."
        : "Item dipindahkan ke Sampah, bukan dihapus permanen. Masih bisa dipulihkan dari Sampah di Google Drive.",
      confirmLabel: "Buang ke Sampah",
      tone: "destructive",
    });
    if (!confirmed) return;
    setBusyId(item.id);
    try {
      await folder.trash(item);
    } finally {
      setBusyId(null);
    }
  };

  const handleRename = async (item: DriveItem, name: string): Promise<string | void> => {
    if (item.name === name) return "";
    if (!(await ensureUnique(name, item.id))) return "Nama itu sudah dipakai di folder ini.";
    await folder.rename(item.id, name);
    return "";
  };

  const handleNewFolder = async (name: string): Promise<string | void> => {
    if (!(await ensureUnique(name))) return "Nama itu sudah dipakai di folder ini.";
    await folder.createNewFolder(name);
    return "";
  };

  const handleNewFolders = async (names: string[]): Promise<string | void> => {
    const existing = new Set((folder.items ?? []).map((f) => f.name.trim().toLowerCase()));
    const clash = names.filter((n) => existing.has(n.trim().toLowerCase()));
    if (clash.length > 0) {
      const shown = clash.slice(0, 3).join(", ");
      const extra = clash.length > 3 ? ` dan ${clash.length - 3} lainnya` : "";
      return `Nama ini sudah dipakai di folder ini: ${shown}${extra}. Hapus atau ubah dulu.`;
    }
    const { created, failed } = await folder.createManyFolders(names);
    if (created.length === 0) return "Tidak ada folder yang dibuat. Coba lagi.";
    if (failed.length > 0) {
      toast.warning(`${created.length} folder dibuat, ${failed.length} gagal: ${failed.slice(0, 3).join(", ")}.`);
    } else {
      toast.success(`${created.length} folder dibuat.`);
    }
    return "";
  };

  const handleCopyLink = async (item: DriveItem) => {
    if (!item.webViewLink) {
      toast.error("Item ini belum punya tautan Google Drive.");
      return;
    }
    const ok = await copyTextToClipboard(item.webViewLink);
    if (ok) toast.success(`Tautan "${item.name}" disalin.`);
    else toast.error("Gagal menyalin tautan. Buka di Google Drive untuk menyalin manual.", { duration: Infinity });
  };

  /** Ekspor Excel (.xls): NO. | Nama | Link Gdrive dari tampilan saat ini (ikut sort + pencarian). */
  const handleExportExcel = () => {
    const rows = folder.visible ?? [];
    if (rows.length === 0) {
      toast.info("Tidak ada item untuk diekspor.");
      return;
    }
    const safe = (current?.name ?? "drive")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
    download(
      `${safe || "drive"}_tautan.xls`,
      buildDriveLinkExcelDoc(
        `Tautan Google Drive — ${current?.name ?? ""}`,
        rows.map((item) => ({ name: item.name, link: item.webViewLink ?? "" })),
      ),
      "application/vnd.ms-excel;charset=utf-8",
    );
    toast.success(`Berkas Excel diekspor — ${rows.length} baris.`);
  };

  const handleNewFile = async (name: string, fileKind: GoogleDocKind): Promise<string | void> => {
    if (!(await ensureUnique(name))) return "Nama itu sudah dipakai di folder ini.";
    const created = await folder.createNewFile(name, fileKind);
    if (!created) return "";
    if (created.webViewLink) {
      const link = created.webViewLink;
      toast.success(`"${created.name}" dibuat.`, {
        action: { label: "Buka di Google Drive", onClick: () => window.open(link, "_blank", "noopener,noreferrer") },
      });
    } else {
      toast.success(`"${created.name}" dibuat.`);
    }
    return "";
  };

  /** Nama kembar membingungkan untuk dokumen keuangan → minta konfirmasi dulu. */
  const ensureUnique = async (name: string, selfId?: string): Promise<boolean> => {
    const duplicate = folder.items?.some(
      (f) => f.id !== selfId && f.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (!duplicate) return true;
    return confirm({
      title: `Nama "${name}" sudah dipakai di folder ini.`,
      description:
        "Google Drive mengizinkan nama kembar, tetapi untuk dokumen keuangan hal itu membingungkan. Tetap gunakan nama ini?",
      confirmLabel: "Tetap gunakan",
    });
  };

  /** Ganti tampilan daftar/grid; pilihan diingat di browser ini. */
  const changeView = (mode: DriveViewMode) => {
    setView(mode);
    try {
      window.localStorage.setItem(VIEW_KEY, mode);
    } catch {
      console.warn("Pilihan tampilan tidak bisa disimpan di browser ini.");
    }
  };

  const handleFiles = (files: FileList | null) => {
    const result = upload.enqueue(files);
    if (result.rejected.length > 0) {
      const names = result.rejected.slice(0, 3).join(", ");
      const extra = result.rejected.length > 3 ? ` dan ${result.rejected.length - 3} file lainnya` : "";
      toast.error(`${names}${extra} melebihi batas 100 MB sehingga tidak diunggah.`);
    }
  };

  const actions = {
    onOpen: handleOpen,
    onDownload: handleDownload,
    onOpenInDrive: openInDrive,
    onCopyLink: (item: DriveItem) => void handleCopyLink(item),
    onRename: (item: DriveItem) => setDialog({ kind: "rename", item }),
    onMove: (item: DriveItem) => setDialog({ kind: "move", item }),
    onTrash: handleTrash,
  };

  // ---- tampilan ----
  // Sesi berakhir tetap menampilkan isi folder terakhir; tanpa root, kembali ke layar hubungkan.
  const showManager = connected || (auth.status === "expired" && auth.root !== null);

  return (
    <div className="space-y-4">
      {confirmNode}

      {!online && (
        <div className="flex items-start gap-2 rounded-md border border-l-4 border-l-warning bg-warning-soft p-3 text-sm text-warning">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Tidak ada koneksi internet</p>
            <p className="text-xs text-muted-foreground">
              Perubahan tidak bisa disimpan sampai koneksi kembali.
            </p>
          </div>
        </div>
      )}

      {auth.status === "expired" && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-l-4 border-l-destructive bg-destructive-soft p-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-destructive">Sesi berakhir</p>
            <p className="text-xs text-muted-foreground">
              Token login kedaluwarsa. Masuk lagi untuk melanjutkan.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void auth.connect()}>
            Masuk lagi
          </Button>
        </div>
      )}

      {auth.status === "error" && auth.error && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-l-4 border-l-destructive bg-destructive-soft p-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-destructive" />
          <p className="min-w-0 flex-1 text-destructive">{auth.error}</p>
          <Button type="button" variant="outline" onClick={() => void auth.connect()}>
            Coba lagi
          </Button>
        </div>
      )}

      {!showManager ? (
        <section className="rounded-lg border bg-card shadow-sm">
          <div className="grid place-items-center gap-3 p-10 text-center">
            {auth.status === "connecting" ? (
              <>
                <LoaderCircle className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Menghubungkan ke Google Drive…</p>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-info-soft text-primary">
                  <Cloud className="size-5" />
                </div>
                <h3 className="font-semibold">Belum terhubung ke Google Drive</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Hubungkan Google Drive untuk melihat isi satu folder root beserta subfoldernya. Berkas
                  diproses langsung dari browser ke Google, tanpa server perantara.
                </p>
                <Button type="button" onClick={() => void auth.connect()}>
                  Hubungkan Google Drive
                </Button>
              </>
            )}
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DriveBreadcrumb path={folder.path} onGo={folder.goTo} />
            <div role="group" aria-label="Tampilan folder" className="flex items-center gap-0.5 rounded-md border p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-pressed={view === "list"}
                title="Tampilan daftar"
                onClick={() => changeView("list")}
                className={view === "list" ? "bg-accent text-primary" : undefined}
              >
                <LayoutList />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-pressed={view === "grid"}
                title="Tampilan grid"
                onClick={() => changeView("grid")}
                className={view === "grid" ? "bg-accent text-primary" : undefined}
              >
                <LayoutGrid />
              </Button>
            </div>
          </div>

          <DriveToolbar
            canAdd={canAdd}
            busy={folder.busy}
            loading={folder.visible === null}
            canExport={(folder.visible?.length ?? 0) > 0}
            query={folder.query}
            sort={folder.sort}
            onSortChange={folder.setSort}
            onQueryChange={folder.setQuery}
            onNewFolder={() => setDialog({ kind: "new-folder" })}
            onNewFolders={() => setDialog({ kind: "new-folders" })}
            onUpload={() => fileInputRef.current?.click()}
            onNewFile={(fileKind) => setDialog({ kind: "new-file", fileKind })}
            onExportExcel={handleExportExcel}
            onRefresh={folder.refresh}
            onLogout={auth.logout}
          />

          {connected && !canAdd && current && (
            <p className="text-xs text-muted-foreground">
              Akun ini hanya bisa melihat isi folder — aksi tulis nonaktif.
            </p>
          )}

          <div
            className={`rounded-lg ${dragging ? "ring-2 ring-primary" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (canAdd) setDragging(true);
            }}
            onDragLeave={(e) => {
              const related = e.relatedTarget;
              if (!(related instanceof Node) || !e.currentTarget.contains(related)) setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (!canAdd) return;
              handleFiles(e.dataTransfer.files);
            }}
          >
            {folder.error ? (
              <div className="grid place-items-center gap-3 rounded-lg border border-l-4 border-l-destructive bg-destructive-soft p-8 text-center">
                <TriangleAlert className="size-5 text-destructive" />
                <p className="max-w-md text-sm text-destructive">{folder.error}</p>
                <Button type="button" variant="outline" onClick={folder.refresh}>
                  Coba lagi
                </Button>
              </div>
            ) : folder.visible === null ? (
              <div className="grid gap-2" aria-label="Memuat isi folder" role="status">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-11 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : folder.visible.length === 0 ? (
              <div className="grid place-items-center gap-3 rounded-lg border bg-card p-10 text-center shadow-sm">
                <div className="flex size-12 items-center justify-center rounded-full bg-info-soft text-primary">
                  {folder.results ? <SearchX className="size-5" /> : <Upload className="size-5" />}
                </div>
                <h3 className="font-semibold">
                  {folder.results ? "Tidak ada yang cocok" : "Folder ini kosong"}
                </h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  {folder.results
                    ? `Tidak ada nama yang mengandung "${folder.query}" pada folder ini.`
                    : canAdd
                      ? "Seret file ke area ini atau tekan Unggah untuk menambahkan berkas."
                      : "Folder ini belum memiliki berkas."}
                </p>
                {folder.results ? (
                  <Button type="button" variant="outline" onClick={() => folder.setQuery("")}>
                    Bersihkan pencarian
                  </Button>
                ) : canAdd ? (
                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                    <Upload />
                    Unggah
                  </Button>
                ) : null}
              </div>
            ) : (
              <>
                {(folder.results || folder.searching) && (
                  <p className="mb-2 text-xs text-muted-foreground" role="status">
                    {folder.searching
                      ? `Mencari "${folder.query}" pada folder ini…`
                      : `Hasil pencarian "${folder.query}" pada folder ini (${folder.visible.length}).`}
                  </p>
                )}
                {view === "grid" ? (
                  <DriveGrid items={folder.visible} busyId={busyId} {...actions} />
                ) : (
                  <DriveList items={folder.visible} busyId={busyId} {...actions} />
                )}
              </>
            )}
          </div>

          <UploadPanel
            tasks={upload.tasks}
            onCancel={upload.cancel}
            onCancelAll={upload.cancelAll}
            onClear={upload.clearFinished}
          />
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {dialog?.kind === "new-folder" && (
        <NameDialog
          title="Folder baru"
          description={`Folder dibuat di dalam "${current?.name ?? ""}".`}
          label="Nama folder"
          submitLabel="Buat folder"
          busy={folder.busy}
          onClose={() => setDialog(null)}
          onSubmit={handleNewFolder}
        />
      )}

      {dialog?.kind === "new-folders" && (
        <BulkFolderDialog
          folderName={current?.name ?? ""}
          busy={folder.busy}
          onClose={() => setDialog(null)}
          onSubmit={handleNewFolders}
        />
      )}

      {dialog?.kind === "new-file" && (
        <NameDialog
          title={`File baru: ${FILE_LABEL[dialog.fileKind]}`}
          description="File Google kosong dibuat di folder aktif dan bisa langsung dibuka di Google Drive."
          label="Nama file"
          submitLabel="Buat file"
          busy={folder.busy}
          onClose={() => setDialog(null)}
          onSubmit={(name) => handleNewFile(name, dialog.fileKind)}
        />
      )}

      {dialog?.kind === "rename" && (
        <NameDialog
          title="Ubah nama"
          label="Nama baru"
          initial={dialog.item.name}
          submitLabel="Simpan"
          busy={folder.busy}
          onClose={() => setDialog(null)}
          onSubmit={(name) => handleRename(dialog.item, name)}
        />
      )}

      {dialog?.kind === "move" && auth.root && (
        <MoveDialog
          root={auth.root}
          item={dialog.item}
          busy={folder.busy}
          onClose={() => setDialog(null)}
          onMove={(item, newParentId) => {
            void folder.move(item, newParentId).then((ok) => {
              if (ok) setDialog(null);
            });
          }}
          onSessionExpired={auth.markExpired}
        />
      )}

      {dialog?.kind === "preview" && (
        <PreviewDialog
          item={dialog.item}
          busy={busyId === dialog.item.id}
          onClose={() => setDialog(null)}
          onDownload={(item) => void handleDownload(item)}
          onSessionExpired={auth.markExpired}
        />
      )}
    </div>
  );
}
