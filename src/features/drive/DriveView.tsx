import DriveManager from "@/components/drive/DriveManager";

/** Halaman File Drive: pengelola isi folder Google Drive. */
export default function DriveView() {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Data dukung SPJ</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kelola berkas desa pada satu folder Google Drive, langsung dari browser.
        </p>
      </div>
      <DriveManager />
    </div>
  );
}
