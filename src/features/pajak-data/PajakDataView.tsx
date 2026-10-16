import { useEffect, useMemo, useState } from "react";
import { idb, peekCache, rememberCache } from "@/lib/storage/idb";
import { parsePajakBuffer, savePajakFile } from "@/lib/pajakFile";
import { toast } from "sonner";
import { vt } from "@/lib/engine/util";
import { rp } from "@/lib/engine/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Row } from "@/types/smd";

interface TableDef {
  key: string;
  name: string;
  desc: string;
  nominalCol?: string;
}

const TABLES: TableDef[] = [
  { key: "pajak", name: "Ta_Pajak", desc: "Setoran pajak (SSP) — satu baris per bukti setor", nominalCol: "Jumlah" },
  { key: "rinci", name: "Ta_PajakRinci", desc: "Rincian SSP — kaitan SSP dengan no bukti/kwitansi", nominalCol: "Nilai" },
];

const SAMPLE_PATH = "dataset/PAJAK_DESA_20261010.smd";
const SAMPLE_NAME = "PAJAK_DESA_20261010.smd";

interface PajakRec {
  name: string;
  pajak: Row[];
  rinci: Row[];
}

export default function PajakDataView() {
  const [file, setFile] = useState<PajakRec | null>(() => peekCache<PajakRec>("src:pajak") ?? null);
  const [tab, setTab] = useState("pajak");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState("");

  const loadSample = async () => {
    setLoading("Memuat file contoh…");
    try {
      const res = await fetch(SAMPLE_PATH);
      if (!res.ok) throw new Error("File contoh tidak ditemukan.");
      const rec = parsePajakBuffer(new Uint8Array(await res.arrayBuffer()), SAMPLE_NAME);
      await savePajakFile(rec);
      setFile(rec);
      setLoading("");
      toast.success("File contoh dimuat.");
    } catch (e) {
      const msg = "Gagal memuat contoh: " + (e instanceof Error ? e.message : String(e));
      setLoading(msg);
      toast.error(msg, { duration: Infinity });
    }
  };

  useEffect(() => {
    void idb().then(async (db) => {
      const rec = (await db.get("sourceFiles", "pajak")) as (PajakRec & { savedAt?: number }) | undefined;
      rememberCache("src:pajak", rec ? { name: rec.name, pajak: rec.pajak, rinci: rec.rinci } : null);
      if (rec) setFile({ name: rec.name, pajak: rec.pajak, rinci: rec.rinci });
    });
  }, []);

  const tableRows = (key: string): Row[] => {
    const v = (file as unknown as Record<string, unknown> | null)?.[key];
    return Array.isArray(v) ? (v as Row[]) : [];
  };

  const totalSetor = useMemo(
    () => (file?.pajak ?? []).reduce((s, r) => s + (Number(r.Jumlah) || 0), 0),
    [file],
  );

  if (!file) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Belum ada file pajak. Muat file di menu <b>Rekap Pajak</b>, atau langsung pakai file contoh:
        </p>
        <Button size="sm" onClick={loadSample} disabled={!!loading && !loading.startsWith("Gagal")}>
          Muat {SAMPLE_NAME}
        </Button>
        {loading && <p className="text-xs text-muted-foreground">{loading}</p>}
      </div>
    );
  }

  const def = TABLES.find((t) => t.key === tab) ?? TABLES[0];
  const rows: Row[] = tableRows(def.key);
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => Object.values(r).some((v) => vt(v).toLowerCase().includes(q))) : rows;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const nominalCol = def.nominalCol;
  const total = nominalCol ? rows.reduce((s, r) => s + (Number(r[nominalCol]) || 0), 0) : 0;

  // Insight pemanfaatan
  const jenisUnik = new Set((file.pajak ?? []).map((p) => vt(p.Kd_Rincian).trim()).filter(Boolean)).size;
  const ntpnKosong = (file.pajak ?? []).filter((p) => !vt(p.NTPN).trim()).length;
  const buktiUnik = new Set((file.rinci ?? []).map((r) => vt(r.No_Bukti).trim()).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Data pajak</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Struktur tabel pajak yang bisa dimanfaatkan fitur lain.</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Sumber: <b>{file.name}</b>
      </p>

      {/* Relasi */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Relasi antar tabel</CardTitle></CardHeader>
        <CardContent className="p-3 font-mono text-xs">
          <div>Ta_Pajak.No_SSP ──► Ta_PajakRinci.No_SSP <span className="text-muted-foreground">(1 SSP → rincian bukti/kwitansi)</span></div>
          <div>Ta_PajakRinci.No_Bukti ──► kwitansi SPP <span className="text-muted-foreground">(kaitan setoran dengan bukti belanja)</span></div>
        </CardContent>
      </Card>

      {/* Tab tabel */}
      <div className="flex flex-wrap gap-1">
        {TABLES.map((t) => {
          const n = tableRows(t.key).length;
          return (
            <Button key={t.key} size="sm" variant={tab === t.key ? "default" : "outline"} className="h-7 text-xs" onClick={() => { setTab(t.key); setSearch(""); }}>
              {t.name} ({n})
            </Button>
          );
        })}
      </div>

      {/* Statistik tabel aktif */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Baris" value={rows.length.toLocaleString("id-ID")} sub={def.desc} />
        <Kpi label="Kolom" value={String(cols.length)} sub="terdeteksi dari data" />
        {nominalCol && <Kpi label={`Total ${nominalCol}`} value={rp(total)} sub={`${def.name}.${nominalCol}`} />}
        <Kpi label="Total setor" value={rp(totalSetor)} sub="Ta_Pajak.Jumlah" />
      </div>

      {/* Kamus kolom */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Kamus kolom — {def.name}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-3">
          <div className="overflow-x-auto rounded-none border-2">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-muted"><th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Kolom</th><th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Terisi</th><th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Contoh nilai</th></tr></thead>
            <tbody>
              {cols.map((c) => {
                const filled = rows.filter((r) => vt(r[c]).trim() !== "").length;
                const sample = vt(rows.find((r) => vt(r[c]).trim() !== "")?.[c] ?? "");
                return (
                  <tr key={c} className="hover:bg-primary/5">
                    <td className="h-11 border px-3 font-mono text-xs">{c}</td>
                    <td className="h-11 border px-3 text-xs">{filled.toLocaleString("id-ID")} / {rows.length.toLocaleString("id-ID")}</td>
                    <td className="h-11 border px-3 text-xs">{sample.slice(0, 80)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {/* Pratinjau */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Pratinjau — {def.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-3">
          <Input className="h-8 w-64 text-xs" placeholder="Cari di tabel…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="overflow-x-auto rounded-none border-2">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted">{cols.map((c) => <th key={c} scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">{c}</th>)}</tr></thead>
              <tbody>
                {filtered.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t hover:bg-primary/5">{cols.map((c) => <td key={c} className="h-11 max-w-64 truncate border px-3">{vt(r[c]).slice(0, 100)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Menampilkan {Math.min(50, filtered.length)} dari {filtered.length.toLocaleString("id-ID")} baris.</p>
        </CardContent>
      </Card>

      {/* Potensi pemanfaatan */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Yang bisa dimanfaatkan dari data ini</CardTitle></CardHeader>
        <CardContent className="p-3">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Kepatuhan setor</b> — {ntpnKosong} SSP tanpa NTPN; potensi checklist bukti setor yang belum lengkap.</li>
            <li><b>Komposisi jenis pajak</b> — {jenisUnik} kode rincian unik (Kd_Rincian); dasar grafik komposisi PPN/PPh/pajak daerah.</li>
            <li><b>Kaitan belanja</b> — {buktiUnik} no bukti unik di rincian; potensi rekonsiliasi setoran vs kwitansi belanja.</li>
            <li><b>Tren waktu</b> — kolom Tgl_SSP memungkinkan grafik setoran bulanan/triwulan.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-3xl font-medium tabular-nums" title={value}>{value}</div>
        <div className="truncate text-xs text-muted-foreground" title={sub}>{sub}</div>
      </CardContent>
    </Card>
  );
}
