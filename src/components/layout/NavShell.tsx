import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import DashboardView from "@/features/dashboard/DashboardView";
import StrukturView from "@/features/struktur/StrukturView";
import RawView from "@/features/raw/RawView";
import ValidasiView from "@/features/validasi/ValidasiView";
import RpdView from "@/features/rpd/RpdView";
import SisaView from "@/features/sisa/SisaView";
import SppView from "@/features/spp/SppView";
import PajakView from "@/features/pajak/PajakView";
import RekonView from "@/features/rekon/RekonView";
import RekapPajakView from "@/features/rekap-pajak/RekapPajakView";
import SppDataView from "@/features/spp-data/SppDataView";
import PajakDataView from "@/features/pajak-data/PajakDataView";
import { useSmdStore } from "@/stores/smd-store";
import { idb, peekCache } from "@/lib/storage/idb";
import { readSppFile } from "@/lib/sppFile";
import { readPajakFile } from "@/lib/pajakFile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Database, FileText, FolderTree, LayoutDashboard, Percent, Receipt, ReceiptText, Scale, ShieldCheck, Table2, Wallet,
} from "lucide-react";

const SECTIONS: Array<{ title: string; items: Array<{ id: string; label: string; icon: typeof LayoutDashboard }> }> = [
  {
    title: "UTAMA",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "RENCANA ANGGARAN",
    items: [
      { id: "struktur", label: "Struktur RAB", icon: FolderTree },
    ],
  },
  {
    title: "PELAKSANAAN",
    items: [
      { id: "rpd", label: "Rencana Penggunaan", icon: ClipboardList },
      { id: "sisa", label: "Sisa Anggaran", icon: Wallet },
      { id: "spp", label: "Register SPP", icon: ReceiptText },
      { id: "rekap-pajak", label: "Rekap Pajak", icon: Receipt },
    ],
  },
  {
    title: "ALAT BANTU",
    items: [
      { id: "pajak", label: "Kalkulator Pajak", icon: Percent },
      { id: "rekon", label: "Rekonsiliasi Kas", icon: Scale },
    ],
  },
  {
    title: "ANALISIS",
    items: [{ id: "validasi", label: "Validasi Data", icon: ShieldCheck }],
  },
  {
    title: "DATA TEKNIS",
    items: [
      { id: "raw", label: "Data Database", icon: Database },
      { id: "spp-data", label: "Data Register SPP", icon: Table2 },
      { id: "data-pajak", label: "Data Pajak", icon: FileText },
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
      () => {
        setFileMsg("");
        refreshFiles();
        setFileBump((b) => b + 1);
      },
      (e) => setFileMsg("Gagal membaca file SPP: " + (e instanceof Error ? e.message : String(e))),
    );
  };
  const gantiPajak = (f: File) => {
    setFileMsg("Membaca file pajak…");
    void readPajakFile(f).then(
      () => {
        setFileMsg("");
        refreshFiles();
        setFileBump((b) => b + 1);
      },
      (e) => setFileMsg("Gagal membaca file pajak: " + (e instanceof Error ? e.message : String(e))),
    );
  };

  const allItems = SECTIONS.flatMap((s) => s.items);

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row">
      {/* Navigasi mobile: deretan tombol shadcn */}
      <div className="flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Navigasi aplikasi">
        {allItems.map((it) => (
          <Button
            key={it.id}
            size="sm"
            variant={active === it.id ? "default" : "outline"}
            className="shrink-0 rounded-full"
            aria-current={active === it.id ? "page" : undefined}
            onClick={() => go(it.id)}
          >
            <it.icon />
            {it.label}
          </Button>
        ))}
      </div>

      {/* Sidebar desktop dari komponen shadcn */}
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="sticky top-20 flex h-[calc(100vh-5.5rem)] flex-col gap-3">
          <Card className="flex min-h-0 flex-col py-2">
            <ScrollArea className="min-h-0 flex-1">
              <nav aria-label="Navigasi aplikasi" className="space-y-3 px-2 py-1">
                {SECTIONS.map((s, si) => (
                  <div key={s.title}>
                    {si > 0 && <Separator className="mb-3" />}
                    <div className="mb-1 px-2 text-xs font-semibold tracking-wide text-muted-foreground">{s.title}</div>
                    <div className="space-y-0.5">
                      {s.items.map((it) => {
                        const isActive = active === it.id;
                        return (
                          <Button
                            key={it.id}
                            variant="ghost"
                            className={`w-full justify-start ${isActive ? "bg-primary/10 font-semibold text-primary hover:bg-primary/15 hover:text-primary" : ""}`}
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => go(it.id)}
                          >
                            <it.icon />
                            <span className="truncate">{it.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </Card>

          <Card className="shrink-0">
            <CardContent className="space-y-2 p-3">
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground">FILE AKTIF</div>
              <FileRow
                label="RAB (Siskeudes)"
                name={fileName}
                inputRef={rabRef}
                onPick={gantiRab}
              >
                {fileName && <Badge variant="secondary" className="text-[10px]">{flat.length.toLocaleString("id-ID")} baris RAB</Badge>}
              </FileRow>
              <FileRow label="SPP" name={sppName} inputRef={sppRef} onPick={gantiSpp} />
              <FileRow label="PAJAK" name={pajakName} inputRef={pajakRef} onPick={gantiPajak} />
              {fileMsg && <div className="text-[11px] text-muted-foreground">{fileMsg}</div>}
            </CardContent>
          </Card>
        </div>
      </aside>

      <section key={fileBump} className="min-w-0 flex-1">
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
        ) : (
          <div className="rounded-md border p-4">
            <h2 className="text-lg font-semibold">{SECTIONS.flatMap((s) => s.items).find((i) => i.id === active)?.label}</h2>
            <p className="text-sm text-muted-foreground">Modul belum dibangun — Fase berikutnya.</p>
          </div>
        )}
      </section>
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
