import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
const DashboardView = lazy(() => import("@/features/dashboard/DashboardView"));
const StrukturView = lazy(() => import("@/features/struktur/StrukturView"));
const RawView = lazy(() => import("@/features/raw/RawView"));
const ValidasiView = lazy(() => import("@/features/validasi/ValidasiView"));
const RpdView = lazy(() => import("@/features/rpd/RpdView"));
const SisaView = lazy(() => import("@/features/sisa/SisaView"));
const SppView = lazy(() => import("@/features/spp/SppView"));
const PajakView = lazy(() => import("@/features/pajak/PajakView"));
const RekonView = lazy(() => import("@/features/rekon/RekonView"));
const RekapPajakView = lazy(() => import("@/features/rekap-pajak/RekapPajakView"));
const SppDataView = lazy(() => import("@/features/spp-data/SppDataView"));
const PajakDataView = lazy(() => import("@/features/pajak-data/PajakDataView"));
const DriveView = lazy(() => import("@/features/drive/DriveView"));
import { useSmdStore } from "@/stores/smd-store";
import { idb, peekCache } from "@/lib/storage/idb";
import { readSppFile } from "@/lib/sppFile";
import { readPajakFile } from "@/lib/pajakFile";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Cloud, Database, FileText, FolderTree, LayoutDashboard, LayoutGrid, Percent, Receipt, ReceiptText, Scale, ShieldCheck, Table2, Wallet,
} from "lucide-react";

export const SECTIONS: Array<{ title: string; items: Array<{ id: string; label: string; icon: typeof LayoutDashboard }> }> = [
  {
    title: "Utama",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Rencana anggaran",
    items: [
      { id: "struktur", label: "Struktur RAB", icon: FolderTree },
    ],
  },
  {
    title: "Pelaksanaan",
    items: [
      { id: "rpd", label: "Rencana penggunaan", icon: ClipboardList },
      { id: "sisa", label: "Sisa anggaran", icon: Wallet },
      { id: "spp", label: "Register SPP", icon: ReceiptText },
      { id: "rekap-pajak", label: "Rekap pajak", icon: Receipt },
    ],
  },
  {
    title: "Alat bantu",
    items: [
      { id: "pajak", label: "Kalkulator pajak", icon: Percent },
      { id: "rekon", label: "Rekonsiliasi kas", icon: Scale },
      { id: "drive", label: "Data Dukung SPJ", icon: Cloud },
    ],
  },
  {
    title: "Analisis",
    items: [{ id: "validasi", label: "Validasi data", icon: ShieldCheck }],
  },
  {
    title: "Data teknis",
    items: [
      { id: "raw", label: "Data database", icon: Database },
      { id: "spp-data", label: "Data register SPP", icon: Table2 },
      { id: "data-pajak", label: "Data pajak", icon: FileText },
    ],
  },
];

const ALL_IDS = new Set(SECTIONS.flatMap((s) => s.items.map((i) => i.id)));
const readHash = () => {
  const h = window.location.hash.replace(/^#\/?/, "").split("/")[0];
  return ALL_IDS.has(h) ? h : "dashboard";
};

export default function NavShell() {
  const [active, setActive] = useState(readHash);
  const { fileName, flat, loadFile } = useSmdStore();
  const rabRef = useRef<HTMLInputElement>(null);
  const sppRef = useRef<HTMLInputElement>(null);
  const pajakRef = useRef<HTMLInputElement>(null);
  const [fileBump, setFileBump] = useState(0);
  const [fileMsg, setFileMsg] = useState("");
  const [sppName, setSppName] = useState<string | null>(
    () => (peekCache<{ name: string }>("src:spp")?.name ?? null),
  );
  const [pajakName, setPajakName] = useState<string | null>(
    () => (peekCache<{ name: string }>("src:pajak")?.name ?? null),
  );

  useEffect(() => {
    const onHash = () => {
      setActive(readHash());
      refreshFiles();
    };
    void refreshFiles();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: string) => {
    window.location.hash = `/${id}`;
    setActive(id);
  };

  const refreshFiles = () => {
    void idb().then(async (db) => {
      const s = (await db.get("sourceFiles", "spp")) as { name?: string } | undefined;
      const p = (await db.get("sourceFiles", "pajak")) as { name?: string } | undefined;
      setSppName(s?.name ?? null);
      setPajakName(p?.name ?? null);
    });
  };

  // Ganti file langsung dari sidebar; view aktif di-mount ulang agar ikut segar.
  const gantiRab = (f: File) => {
    setFileMsg("");
    void loadFile(f).then(() => setFileBump((b) => b + 1));
  };
  const gantiSpp = (f: File) => {
    setFileMsg("Membaca file SPP…");
    void readSppFile(f).then(
      (rec) => {
        setFileMsg("");
        refreshFiles();
        setFileBump((b) => b + 1);
        toast.success(`File SPP dimuat — ${rec.reg.length} SPP, ${rec.bukti.length} kwitansi.`);
      },
      (e) => {
        const msg = "Gagal membaca file SPP: " + (e instanceof Error ? e.message : String(e));
        setFileMsg(msg);
        toast.error(msg, { duration: Infinity });
      },
    );
  };
  const gantiPajak = (f: File) => {
    setFileMsg("Membaca file pajak…");
    void readPajakFile(f).then(
      (rec) => {
        setFileMsg("");
        refreshFiles();
        setFileBump((b) => b + 1);
        toast.success(`File pajak dimuat — ${rec.pajak.length} SSP.`);
      },
      (e) => {
        const msg = "Gagal membaca file pajak: " + (e instanceof Error ? e.message : String(e));
        setFileMsg(msg);
        toast.error(msg, { duration: Infinity });
      },
    );
  };

  const allItems = SECTIONS.flatMap((s) => s.items);
  const QUICK_IDS = ["dashboard", "rpd", "spp", "rekap-pajak"];
  const quickItems = QUICK_IDS.flatMap((id) => {
    const it = allItems.find((i) => i.id === id);
    return it ? [it] : [];
  });
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex w-full flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="sticky top-[var(--header-h)] flex h-[calc(100vh-var(--header-h))] flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <nav aria-label="Navigasi aplikasi" className="px-2 py-2">
              {SECTIONS.map((s) => (
                <div key={s.title}>
                  <div className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">{s.title}</div>
                  {s.items.map((it) => {
                    const isActive = active === it.id;
                    return (
                      <Button
                        key={it.id}
                        variant="ghost"
                        className={`relative h-10 w-full items-center justify-start gap-3 rounded-md px-3 text-sm font-normal ${isActive ? "bg-accent font-medium text-gold hover:bg-accent hover:text-gold" : "text-foreground/80 hover:bg-accent"}`}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => go(it.id)}
                      >
                        {isActive && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold" />}
                        <it.icon className="size-5 shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </Button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </ScrollArea>

          <div className="shrink-0 space-y-2 border-t p-3">
            <div className="text-xs font-medium text-muted-foreground">File aktif</div>
            <FileRow
              label="RAB (Siskeudes)"
              name={fileName}
              inputRef={rabRef}
              onPick={gantiRab}
            >
              {fileName && <Badge variant="secondary" className="text-[10px]">{flat.length.toLocaleString("id-ID")} baris RAB</Badge>}
            </FileRow>
            <FileRow label="SPP" name={sppName} inputRef={sppRef} onPick={gantiSpp} />
            <FileRow label="Pajak" name={pajakName} inputRef={pajakRef} onPick={gantiPajak} />
            {fileMsg && <div className="text-[11px] text-muted-foreground">{fileMsg}</div>}
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-6 md:pb-6">
      <section key={fileBump}>
        <Suspense fallback={<ViewFallback />}>
        {active === "dashboard" ? (
          <DashboardView />
        ) : active === "struktur" ? (
          <StrukturView />
        ) : active === "raw" ? (
          <RawView />
        ) : active === "spp-data" ? (
          <SppDataView />
        ) : active === "data-pajak" ? (
          <PajakDataView />
        ) : active === "validasi" ? (
          <ValidasiView />
        ) : active === "rpd" ? (
          <RpdView />
        ) : active === "sisa" ? (
          <SisaView />
        ) : active === "spp" ? (
          <SppView />
        ) : active === "pajak" ? (
          <PajakView />
        ) : active === "rekap-pajak" ? (
          <RekapPajakView />
        ) : active === "rekon" ? (
          <RekonView />
        ) : active === "drive" ? (
          <DriveView />
        ) : (
          <div className="rounded-md border p-4">
            <h2 className="text-lg font-semibold">{SECTIONS.flatMap((s) => s.items).find((i) => i.id === active)?.label}</h2>
            <p className="text-sm text-muted-foreground">Modul belum dibangun — Fase berikutnya.</p>
          </div>
        )}
        </Suspense>
      </section>
      </div>

      {/* Bottom bar mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Navigasi aplikasi">
        {menuOpen && (
          <div className="grid max-h-72 grid-cols-2 gap-1 overflow-y-auto border-b p-2">
            {allItems.map((it) => {
              const isActive = active === it.id;
              return (
                <Button
                  key={it.id}
                  variant="ghost"
                  className={`h-10 justify-start gap-3 rounded-md px-3 text-sm font-normal ${isActive ? "bg-accent font-medium text-primary" : "text-foreground/80"}`}
                  onClick={() => { setMenuOpen(false); go(it.id); }}
                >
                  <it.icon className="size-5 shrink-0" />
                  <span className="truncate">{it.label}</span>
                </Button>
              );
            })}
          </div>
        )}
        <div className="grid h-16 grid-cols-5">
          {quickItems.map((it) => {
            const isActive = active === it.id;
            return (
              <button
                key={it.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => go(it.id)}
                className={`flex min-h-10 flex-col items-center justify-center gap-1 ${isActive ? "font-medium text-primary" : "text-muted-foreground"}`}
              >
                <it.icon className="size-5" />
                <span className="px-0.5 text-center text-[11px] leading-tight">{it.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className={`flex min-h-10 flex-col items-center justify-center gap-1 ${menuOpen ? "font-medium text-primary" : "text-muted-foreground"}`}
          >
            <LayoutGrid className="size-5" />
            <span className="text-[11px] leading-tight">Menu</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function ViewFallback() {
  return (
    <div className="space-y-4" aria-label="Memuat halaman">
      <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
      <div className="grid gap-2 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function FileRow({
  label,
  name,
  inputRef,
  onPick,
  children,
}: {
  label: string;
  name: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (f: File) => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
        <button
          type="button"
          className="shrink-0 rounded px-1 text-[10px] font-medium text-primary hover:bg-accent"
          title={`Ganti file ${label}`}
          onClick={() => inputRef.current?.click()}
        >
          Ganti
        </button>
      </div>
      <div className={`truncate text-xs ${name ? "font-medium" : "text-muted-foreground"}`} title={name ?? ""}>
        {name ?? "Belum ada"}
      </div>
      {children}
      <input
        ref={inputRef}
        type="file"
        accept=".smd,.SMD"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
