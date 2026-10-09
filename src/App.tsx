import { useEffect, useRef } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useSmdStore } from "@/stores/smd-store";
import { Button } from "@/components/ui/button";
import NavShell from "@/components/layout/NavShell";
import { Moon, Sun, Upload } from "lucide-react";

export default function App() {
  const { theme, toggle, init } = useThemeStore();
  const { status, loadFile, fileName, flat } = useSmdStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    init();
    void useSmdStore.getState().restore();
  }, [init]);

  return (
    <div id="app-root" className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-card/80 px-4 py-3 backdrop-blur flex items-center justify-between">
        <div>
          <h1 className="font-bold leading-tight text-primary">ASISTENKEU</h1>
          <p className="text-xs text-muted-foreground">Asisten Keuangan Desa — data Siskeudes diproses di browser</p>
        </div>
        <Button variant="outline" size="sm" onClick={toggle}>
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Mode terang" : "Mode gelap"}
        </Button>
      </header>

      <main className="mx-auto w-full max-w-[1440px] p-4 space-y-4">
        {!fileName && (
          <div
            className="rounded-lg border border-dashed p-8 text-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void loadFile(f);
            }}
          >
            <Upload className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-2 font-semibold">Pilih atau seret file .SMD ke sini</h2>
            <p className="text-sm text-muted-foreground">File diproses &amp; disimpan lokal di browser (IndexedDB).</p>
            <input
              ref={inputRef}
              type="file"
              accept=".smd,.SMD"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void loadFile(f);
              }}
            />
          </div>
        )}

        {status.text && (
          <div
            role="status"
            aria-live="polite"
            className={
              status.kind === "error"
                ? "rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
                : status.kind === "ok"
                  ? "rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-400"
                  : "rounded-md border p-3 text-sm text-muted-foreground"
            }
          >
            {status.text}
          </div>
        )}

        {fileName && (
          <div className="rounded-md border p-3 text-sm">
            <b>File aktif:</b> {fileName} — {flat.length} baris RAB.
          </div>
        )}

        {fileName && <NavShell />}
      </main>
    </div>
  );
}
