import { FileSpreadsheet, LogOut, RefreshCw, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GoogleDocKind } from "@/lib/googleDrive";
import type { DriveSort } from "@/hooks/useDriveFolder";
import { CreateMenu } from "@/components/drive/CreateMenu";

export interface DriveToolbarProps {
  canAdd: boolean;
  busy: boolean;
  loading: boolean;
  canExport: boolean;
  query: string;
  sort: DriveSort;
  onSortChange: (value: DriveSort) => void;
  onQueryChange: (value: string) => void;
  onNewFolder: () => void;
  onNewFolders: () => void;
  onUpload: () => void;
  onNewFile: (kind: GoogleDocKind) => void;
  onExportExcel: () => void;
  onRefresh: () => void;
  onLogout: () => void;
}

/** Cari nama pada folder aktif (FR-10) plus aksi toolbar. */
export function DriveToolbar({
  canAdd,
  busy,
  loading,
  canExport,
  query,
  sort,
  onSortChange,
  onQueryChange,
  onNewFolder,
  onNewFolders,
  onUpload,
  onNewFile,
  onExportExcel,
  onRefresh,
  onLogout,
}: DriveToolbarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cari nama di folder ini"
            aria-label="Cari nama di folder ini"
            className="pl-8"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => {
            if (value === "nama" || value === "terbaru" || value === "terlama") onSortChange(value);
          }}
        >
          <SelectTrigger aria-label="Urutkan isi folder" className="w-full sm:w-40">
            <SelectValue placeholder="Urutkan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nama">Nama</SelectItem>
            <SelectItem value="terbaru">Terbaru</SelectItem>
            <SelectItem value="terlama">Terlama</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="default" onClick={onUpload} disabled={!canAdd || busy}>
          <Upload />
          Unggah
        </Button>
        <CreateMenu
          disabled={!canAdd || busy}
          onNewFolder={onNewFolder}
          onNewFolders={onNewFolders}
          onNewFile={onNewFile}
        />
        <Button variant="outline" onClick={onExportExcel} disabled={!canExport || busy}>
          <FileSpreadsheet />
          Ekspor Excel
        </Button>
        <Button variant="ghost" onClick={onRefresh} disabled={loading} title="Segarkan isi folder">
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          Segarkan
        </Button>
        <Button variant="ghost" className="md:ml-auto" onClick={onLogout} title="Keluar dari Google Drive">
          <LogOut />
          Keluar
        </Button>
      </div>
    </div>
  );
}
