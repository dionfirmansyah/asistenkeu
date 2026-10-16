import { useEffect, useMemo, useRef, useState } from "react";
import { useThemeStore } from "@/stores/theme-store";
import { useSmdStore } from "@/stores/smd-store";
import { villageIdentity } from "@/lib/engine/identity";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText, Moon, Sun, Upload, User } from "lucide-react"
import NavShell, { SECTIONS } from "@/components/layout/NavShell";
import { Toaster } from "@/components/ui/sonner";

const initialsOf = (nama: string): string =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export default function App() {
  const { theme, toggle, init } = useThemeStore();
  const { loadFile, fileName, tables } = useSmdStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [restoring, setRestoring] = useState(true);
  const ident = useMemo(() => villageIdentity(tables), [tables]);
  const [crumb, setCrumb] = useState(() => window.location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard");

  useEffect(() => {
    init();
    void useSmdStore.getState().restore().finally(() => setRestoring(false));
    const onHash = () => setCrumb(window.location.hash.replace(/^#\/?/, "").split("/")[0] || "dashboard");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [init]);

  const crumbLabel = SECTIONS.flatMap((s) => s.items).find((i) => i.id === crumb)?.label ?? "Dashboard";

  return (
    <div id="app-root" className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-10">
        {/* Bar utama — kertas dengan garis bawah 3px */}
        <div className="border-b-[3px] border-border bg-background text-foreground">
          <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4">
            {/* Logo + nama aplikasi */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center bg-foreground font-mono text-sm font-semibold text-background" aria-hidden="true">
                A
              </div>
              <div className="min-w-0 leading-tight">
                <h1 className="font-display text-lg font-extrabold">ASISTENKEU</h1>
                <p className="truncate text-xs text-muted-foreground">Asisten Keuangan Desa</p>
              </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              {/* File aktif */}
              {fileName && (
                <div
                  className="hidden max-w-56 items-center gap-1.5 rounded-sm border-2 border-border bg-card px-2.5 py-1 font-mono text-xs text-foreground sm:flex"
                  title={fileName}
                >
                  <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}

              {/* Identitas operator */}
              {fileName && (
                <>
                  <div className="hidden h-8 w-px bg-border md:block" />
                  <div
                    className="hidden min-w-0 items-center gap-2.5 md:flex"
                    title={ident.kaur ? `Operator: ${ident.kaur}${ident.desa ? ` — Desa ${ident.desa}` : ""}` : "Operator Siskeudes"}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-sm border-2 border-border bg-card text-xs font-bold text-foreground">
                      {initialsOf(ident.kaur) || <User className="size-4" />}
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="max-w-44 truncate text-sm font-semibold">{ident.kaur || "Operator"}</div>
                      <div className="max-w-44 truncate text-xs text-muted-foreground">
                        Kaur Keuangan{ident.desa ? ` · ${ident.desa}` : ""}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="hidden h-8 w-px bg-border sm:block" />

              {/* Toggle tema */}
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={toggle}
                title={theme === "dark" ? "Mode terang" : "Mode gelap"}
                aria-label={theme === "dark" ? "Mode terang" : "Mode gelap"}
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bar breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex h-8 w-full max-w-[1440px] items-center gap-1.5 px-4 text-xs text-muted-foreground">
            <button
              type="button"
              className="shrink-0 hover:text-foreground"
              onClick={() => { window.location.hash = "/dashboard"; }}
            >
              Beranda
            </button>
            <ChevronRight className="size-3 shrink-0" />
            <span className="truncate font-medium text-foreground">{crumbLabel}</span>
            
          </div>
        </div>
      </header>

      <main className="w-full">
        {restoring ? (
          <div className="mx-auto w-full max-w-[1440px] space-y-4 p-4" aria-label="Memuat data tersimpan">
            <div className="h-24 animate-pulse rounded-none bg-muted" />
            <div className="h-64 animate-pulse rounded-none bg-muted" />
          </div>
        ) : !fileName ? (
          <div className="mx-auto w-full max-w-[1440px] p-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Pilih atau seret file .SMD ke sini"
            className="rounded-none border-2 border-dashed p-8 text-center cursor-pointer"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void loadFile(f);
            }}
          >
            <div className="mx-auto flex size-12 items-center justify-center rounded-sm border-2 border-border bg-card text-primary">
              <Upload className="size-5" />
            </div>
            <h2 className="mt-3 font-semibold">Belum ada file Siskeudes</h2>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Unggah file .SMD untuk mulai. Data diproses di perangkat ini dan tidak dikirim ke server.</p>
            <Button className="mt-4" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>Unggah file .SMD</Button>
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
          </div>
        ) : (
          <NavShell />
        )}
      </main>
      <Toaster theme={theme} richColors={true}/>
    </div>
  );
}
