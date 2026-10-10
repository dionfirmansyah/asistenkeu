import { useEffect, useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { idb, peekCache, rememberCache } from "@/lib/storage/idb";
import { parseSppBuffer, saveSppFile, type SppRec } from "@/lib/sppFile";
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
  { key: "reg", name: "Ta_SPP", desc: "Register SPP — satu baris per SPP yang diterbitkan", nominalCol: "Jumlah" },
  { key: "rinci", name: "Ta_SPPRinci", desc: "Rincian SPP — alokasi SPP per kegiatan/rekening" },
  { key: "bukti", name: "Ta_SPPBukti", desc: "Kwitansi/bukti — realisasi pembayaran per penerima", nominalCol: "Nilai" },
  { key: "pot", name: "Ta_SPPPot", desc: "Potongan pajak — PPh/PPN yang dipotong per kwitansi", nominalCol: "Nilai" },
];

export default function SppDataView() {
  const { flat } = useSmdStore();
  const [spp, setSpp] = useState<SppRec | null>(() => peekCache<SppRec>("src:spp") ?? null);
  const [tab, setTab] = useState("reg");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState("");

  const loadSample = async () => {
    setLoading("Memuat file contoh…");
    try {
      const res = await fetch("dataset/SPP_DESA_20261006.smd");
      if (!res.ok) throw new Error("File contoh tidak ditemukan.");
      const rec = parseSppBuffer(new Uint8Array(await res.arrayBuffer()), "SPP_DESA_20261006.smd");
      await saveSppFile(rec);
      setSpp(rec);
      setLoading("");
    } catch (e) {
      setLoading("Gagal memuat contoh: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  useEffect(() => {
    void idb().then(async (db) => {
      const rec = (await db.get("sourceFiles", "spp")) as typeof spp | undefined;
      rememberCache("src:spp", rec ?? null);
      if (rec) setSpp(rec);
    });
  }, []);

  const kegName = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of flat) if (!r.Pseudo && !m.has(r.Kd_Keg)) m.set(r.Kd_Keg, r.Nama_Kegiatan || r.Kd_Keg);
    return m;
  }, [flat]);

  if (!spp) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Belum ada file SPP. Muat file di menu <b>Register SPP</b>, atau langsung pakai file contoh:
        </p>
        <Button size="sm" onClick={loadSample} disabled={!!loading && !loading.startsWith("Gagal")}>
          Muat SPP_DESA_20261006.smd
        </Button>
        {loading && <p className="text-xs text-muted-foreground">{loading}</p>}
      </div>
    );
  }

  const tableRows = (key: string): Row[] => {
    const v = (spp as unknown as Record<string, unknown>)[key];
    return Array.isArray(v) ? (v as Row[]) : [];
  };

  const def = TABLES.find((t) => t.key === tab) ?? TABLES[0];
  const rows: Row[] = tableRows(def.key);
  const q = search.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => Object.values(r).some((v) => vt(v).toLowerCase().includes(q))) : rows;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const nominalCol = def.nominalCol;
  const total = nominalCol ? rows.reduce((s, r) => s + (Number(r[nominalCol]) || 0), 0) : 0;

  // Insight pemanfaatan
  const penerimaUnik = new Set((spp.bukti ?? []).map((b) => vt(b.Nm_Penerima).trim()).filter(Boolean)).size;
  const danaUnik = new Set((spp.bukti ?? []).map((b) => vt(b.Sumberdana).trim()).filter(Boolean)).size;
  const tanpaLink = (spp.bukti ?? []).filter((b) => !vt(b.link_bukti).trim()).length;
  const kegUnik = new Set((spp.bukti ?? []).map((b) => vt(b.Kd_Keg).trim()).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sumber: <b>{spp.name}</b> — struktur tabel SPP yang bisa dimanfaatkan fitur lain.
      </p>

      {/* Relasi */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Relasi antar tabel</CardTitle></CardHeader>
        <CardContent className="p-3 font-mono text-xs">
          <div>Ta_SPP.No_SPP ──► Ta_SPPRinci.No_SPP <span className="text-muted-foreground">(1 SPP → banyak rincian kegiatan)</span></div>
          <div>Ta_SPP.No_SPP ──► Ta_SPPBukti.No_SPP <span className="text-muted-foreground">(1 SPP → banyak kwitansi)</span></div>
          <div>Ta_SPPBukti.(No_SPP, No_Bukti) ──► Ta_SPPPot.(No_SPP, No_Bukti) <span className="text-muted-foreground">(1 kwitansi → banyak potongan)</span></div>
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
        {def.nominalCol && <Kpi label={`Total ${def.nominalCol}`} value={rp(total)} sub={`${def.name}.${def.nominalCol}`} />}
        <Kpi label="Penerima unik (kwitansi)" value={penerimaUnik.toLocaleString("id-ID")} sub="Ta_SPPBukti.Nm_Penerima" />
      </div>

      {/* Kamus kolom */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Kamus kolom — {def.name}</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead><tr className="bg-muted text-xs"><th className="border px-2 py-1 text-left">Kolom</th><th className="border px-2 py-1 text-left">Terisi</th><th className="border px-2 py-1 text-left">Contoh nilai</th></tr></thead>
            <tbody>
              {cols.map((c) => {
                const filled = rows.filter((r) => vt(r[c]).trim() !== "").length;
                const sample = vt(rows.find((r) => vt(r[c]).trim() !== "")?.[c] ?? "");
                return (
                  <tr key={c}>
                    <td className="border px-2 py-1 font-mono text-xs">{c}</td>
                    <td className="border px-2 py-1 text-xs">{filled.toLocaleString("id-ID")} / {rows.length.toLocaleString("id-ID")}</td>
                    <td className="border px-2 py-1 text-xs">{c === "Kd_Keg" && kegName.get(sample) ? `${sample} — ${kegName.get(sample)}` : sample.slice(0, 80)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pratinjau */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Pratinjau — {def.name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-3">
          <Input className="h-8 w-64 text-xs" placeholder="Cari di tabel…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead><tr className="bg-muted">{cols.map((c) => <th key={c} className="border px-2 py-1 text-left">{c}</th>)}</tr></thead>
              <tbody>
                {filtered.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-t">{cols.map((c) => <td key={c} className="max-w-64 truncate border px-2 py-1">{vt(r[c]).slice(0, 100)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Menampilkan {Math.min(50, filtered.length)} dari {filtered.length.toLocaleString("id-ID")} baris.</p>
        </CardContent>
      </Card>

      {/* Potensi pemanfaatan */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Yang bisa dimanfaatkan dari data ini</CardTitle></CardHeader>
        <CardContent className="p-3">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li><b>Realisasi vs RAB</b> — bandingkan Ta_SPPBukti.Nilai per kegiatan ({kegUnik} kegiatan di file ini) dengan pagu RAB; dasar untuk Sisa Anggaran berbasis realisasi.</li>
            <li><b>Analisis pajak</b> — Ta_SPPPot berisi potongan per kwitansi; bisa diagregasi per jenis pajak dan dicocokkan dengan Kalkulator Pajak.</li>
            <li><b>Profil penerima</b> — {penerimaUnik} penerima unik; potensi daftar rekanan + total nilai per penerima.</li>
            <li><b>Sumber dana</b> — {danaUnik} sumber dana unik pada kwitansi; potensi komposisi realisasi per sumber dana.</li>
            <li><b>Kelengkapan bukti</b> — {tanpaLink} kwitansi tanpa link bukti Google Drive; potensi checklist kelengkapan arsip.</li>
            <li><b>Tren waktu</b> — kolom tanggal (Tgl_SPP, Tgl_Bukti) memungkinkan grafik realisasi bulanan/triwulan.</li>
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
        <div className="truncate text-lg font-semibold" title={value}>{value}</div>
        <div className="truncate text-xs text-muted-foreground" title={sub}>{sub}</div>
      </CardContent>
    </Card>
  );
}
