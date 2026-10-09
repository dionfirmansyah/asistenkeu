import { useEffect, useState } from "react";
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
import { useRef } from "react";
import { useSmdStore } from "@/stores/smd-store";
import {
  ClipboardList, Database, FolderTree, LayoutDashboard, PiggyBank, Percent, Receipt, ReceiptText, Scale, ShieldCheck, Table2,
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
      { id: "sisa", label: "Sisa Anggaran", icon: PiggyBank },
      { id: "spp", label: "Register SPP", icon: ReceiptText },
      { id: "rekap-pajak", label: "Rekap Pajak", icon: Receipt },
      { id: "rekon", label: "Rekonsiliasi Kas", icon: Scale },
    ],
  },
  {
    title: "ALAT BANTU",
    items: [{ id: "pajak", label: "Kalkulator Pajak", icon: Percent }],
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
  const { fileName, loadFile } = useSmdStore();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHash = () => setActive(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: string) => {
    window.location.hash = `/${id}`;
    setActive(id);
  };

  return (
    <div className="flex w-full flex-col gap-4 md:flex-row">
      {/* Navigasi mobile: baris tombol scrollable horizontal */}
      <nav className="flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Navigasi aplikasi">
        {SECTIONS.flatMap((s) => s.items).map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => go(it.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${active === it.id ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            <it.icon className="size-3.5" />
            {it.label}
          </button>
        ))}
      </nav>
      <aside className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pr-1">
        <div className="mb-3 rounded-md border p-2 text-xs">
          <div className="font-semibold text-muted-foreground">FILE AKTIF</div>
          <div className="truncate" title={fileName ?? ""}>{fileName ?? "-"}</div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full rounded-md border px-2 py-1 text-xs hover:bg-accent"
          >
            Ganti file .SMD
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".smd,.SMD"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f);
              e.target.value = "";
            }}
          />
        </div>
        <nav aria-label="Navigasi aplikasi" className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground">{s.title}</div>
              {s.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => go(it.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active === it.id ? "bg-accent font-medium" : "hover:bg-accent/60"}`}
                >
                  <it.icon className="size-4" />
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        {active === "dashboard" ? (
          <DashboardView />
        ) : active === "struktur" ? (
          <StrukturView />
        ) : active === "raw" ? (
          <RawView />
        ) : active === "spp-data" ? (
          <SppDataView />
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
