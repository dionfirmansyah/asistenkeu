import { useEffect, useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { idbAll, peekCache, rememberCache, type RpdEntry } from "@/lib/storage/idb";
import { nfInt0, rp } from "@/lib/engine/format";
import { toCSV, download } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { DanaBadge } from "@/components/ui/dana-badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RabFlatRow } from "@/types/smd";

const EPS = 1e-9;
const JENIS: Record<string, string> = { "5.1": "Belanja Pegawai", "5.2": "Belanja Barang dan Jasa", "5.3": "Belanja Modal", "5.4": "Belanja Tidak Terduga" };
const jenisKey = (kd: string) => String(kd || "").split(".").filter(Boolean).slice(0, 2).join(".") || "-";
const jenisLabel = (k: string) => (k === "-" ? "(tanpa kode rekening)" : JENIS[k] ? `${k} — ${JENIS[k]}` : k);

interface SisaRow {
  kegKd: string;
  rincId: string;
  r: RabFlatRow;
  noUrut: string;
  jenis: string;
  asal: string;
  usedVol: number;
  usedAmt: number;
  sisaVol: number;
  sisaAmt: number;
  status: "done" | "partial" | "none";
}

export default function SisaView() {
  const { flat } = useSmdStore();
  const [entries, setEntries] = useState<RpdEntry[]>(() => {
    const head = flat[0];
    const key = head ? `${head.Kd_Desa}-${head.Tahun}` : "default";
    return peekCache<RpdEntry[]>(`entries:${key}`) ?? [];
  });
  const [asal, setAsal] = useState("");
  const [jenis, setJenis] = useState("");
  const [dana, setDana] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const head = flat[0];
    const scope = head ? `${head.Kd_Desa}-${head.Tahun}` : "default";
    void idbAll<RpdEntry>("entries", scope).then((rows) => {
      rememberCache(`entries:${scope}`, rows);
      setEntries(rows);
    });
  }, [flat]);

  const rows = useMemo<SisaRow[]>(() => {
    const used = new Map<string, { vol: number; amt: number }>();
    for (const x of entries) {
      const u = used.get(x.key) ?? { vol: 0, amt: 0 };
      u.vol += x.vol; u.amt += x.amt;
      used.set(x.key, u);
    }
    const out: SisaRow[] = [];
    for (const r of flat) {
      if (r.Pseudo || r.Jenis !== "BELANJA" || !r.AnggaranStlhPAK) continue;
      const key = [r.Kd_Keg, r.Kd_Rincian, r.Kd_SubRinci, r.No_Urut].join("|");
      const u = used.get(key) ?? { vol: 0, amt: 0 };
      const sisaVol = Math.max(0, r.JmlSatuanPAK - u.vol);
      const sisaAmt = Math.max(0, r.AnggaranStlhPAK - u.amt);
      const hasSisa = sisaVol > EPS || sisaAmt >= 1;
      const touched = u.vol > EPS || u.amt >= 1;
      out.push({
        kegKd: r.Kd_Keg, rincId: r.Kd_SubRinci, r, noUrut: r.No_Urut,
        jenis: jenisKey(r.Kd_Rincian), asal: r.Asal ?? "BARU",
        usedVol: u.vol, usedAmt: u.amt, sisaVol, sisaAmt,
        status: !hasSisa ? "done" : touched ? "partial" : "none",
      });
    }
    return out.sort((a, b) => a.kegKd.localeCompare(b.kegKd, "id", { numeric: true }) || a.rincId.localeCompare(b.rincId, "id", { numeric: true }) || a.r.Kd_Rincian.localeCompare(b.r.Kd_Rincian, "id", { numeric: true }) || a.noUrut.localeCompare(b.noUrut, "id", { numeric: true }));
  }, [flat, entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((x) => {
      if (asal && x.asal !== asal) return false;
      if (jenis && x.jenis !== jenis) return false;
      if (dana && (x.r.SumberDana || "(tanpa sumber dana)") !== dana) return false;
      if (q) {
        const hay = [x.r.Uraian, x.r.Kd_Rincian, x.r.Kd_Keg, x.r.Nama_Kegiatan, x.r.Nama_Rincian, x.r.SumberDana, x.r.Nm_PPTKD, x.r.Satuan].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // hanya yang punya sisa
      return x.sisaVol > EPS || x.sisaAmt >= 1;
    });
  }, [rows, asal, jenis, dana, search]);

  const totSisa = filtered.reduce((s, x) => s + x.sisaAmt, 0);
  const totRab = filtered.reduce((s, x) => s + x.r.AnggaranStlhPAK, 0);
  const totRencana = filtered.reduce((s, x) => s + x.usedAmt, 0);

  const exportCsv = () => {
    const cols: [string, string][] = [["keg", "Kode Kegiatan"], ["rinc", "Rincian"], ["uraian", "Uraian"], ["jenis", "Jenis"], ["dana", "Sumber Dana"], ["asal", "Asal"], ["volRab", "Volume RAB"], ["volRpd", "Volume RPD"], ["sisaVol", "Volume Sisa"], ["pagu", "Pagu RAB"], ["ren", "Rencana"], ["sisa", "Sisa"], ["status", "Status"]];
    const data = filtered.map((x) => ({
      keg: x.kegKd, rinc: x.r.Nama_Rincian, uraian: x.r.Uraian, jenis: jenisLabel(x.jenis), dana: x.r.SumberDana, asal: x.asal === "SILPA" ? "Dana SiLPA" : "RAB awal",
      volRab: x.r.JmlSatuanPAK, volRpd: x.usedVol, sisaVol: x.sisaVol, pagu: x.r.AnggaranStlhPAK, ren: x.usedAmt, sisa: x.sisaAmt,
      status: x.status === "none" ? "Belum direncanakan" : x.status === "partial" ? "Sebagian" : "Selesai",
    }));
    download("sisa_anggaran.csv", toCSV(cols, data));
  };

  const jenisOpts = [...new Set(rows.map((x) => x.jenis))].sort();
  const danaOpts = [...new Set(rows.map((x) => x.r.SumberDana || "(tanpa sumber dana)"))].sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Total sisa anggaran" value={rp(totSisa)} sub={`${filtered.length.toLocaleString("id-ID")} item`} />
        <Kpi label="Pagu RAB (sesudah PAK)" value={rp(totRab)} sub="pada item yang masih sisa" />
        <Kpi label="Sudah direncanakan" value={rp(totRencana)} sub={totRab ? `${Math.round((totRencana / totRab) * 100)}% dari pagu` : ""} />
        <Kpi label="Belum direncanakan (status none)" value={rp(filtered.filter((x) => x.status === "none").reduce((s, x) => s + x.sisaAmt, 0))} sub={`${filtered.filter((x) => x.status === "none").length} item`} />
      </div>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Filter</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 p-3">
          <Select value={asal} onValueChange={(v) => setAsal(v === "_all" ? "" : v ?? "")}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Semua asal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Semua asal</SelectItem>
              <SelectItem value="BARU">RAB awal</SelectItem>
              <SelectItem value="SILPA">Dana SiLPA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={jenis} onValueChange={(v) => setJenis(v === "_all" ? "" : v ?? "")}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Semua jenis" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Semua jenis</SelectItem>
              {jenisOpts.map((j) => <SelectItem key={j} value={j}>{jenisLabel(j)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={dana} onValueChange={(v) => setDana(v === "_all" ? "" : v ?? "")}>
            <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Semua sumber dana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Semua sumber dana</SelectItem>
              {danaOpts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input className="h-8 w-56 text-xs" placeholder="Cari uraian…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button size="sm" variant="outline" onClick={exportCsv}>Ekspor CSV</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Daftar sisa anggaran ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-xs">
                <th className="border px-2 py-1 text-left">KEGIATAN</th>
                <th className="border px-2 py-1 text-left">RINCIAN</th>
                <th className="border px-2 py-1 text-left">URAIAN</th>
                <th className="border px-2 py-1 text-left">SUMBER DANA</th>
                <th className="border px-2 py-1 text-left">ASAL</th>
                <th className="border px-2 py-1 text-center">VOLUME SISA</th>
                <th className="border px-2 py-1 text-right">PAGU (Rp)</th>
                <th className="border px-2 py-1 text-right">RENCANA (Rp)</th>
                <th className="border px-2 py-1 text-right">SISA (Rp)</th>
                <th className="border px-2 py-1 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x, i) => (
                <tr key={i} className="align-top">
                  <td className="border px-2 py-1 text-xs">{x.kegKd}</td>
                  <td className="border px-2 py-1">{x.r.Nama_Rincian}</td>
                  <td className="border px-2 py-1">{x.r.Uraian}</td>
                  <td className="border px-2 py-1 text-xs"><DanaBadge value={x.r.SumberDana} /></td>
                  <td className="border px-2 py-1 text-xs">{x.asal === "SILPA" ? "Dana SiLPA" : "RAB awal"}</td>
                  <td className="border px-2 py-1 text-center">{nfInt0(x.sisaVol)} {x.r.Satuan}</td>
                  <td className="border px-2 py-1 num">{rp(x.r.AnggaranStlhPAK)}</td>
                  <td className="border px-2 py-1 num">{rp(x.usedAmt)}</td>
                  <td className="border px-2 py-1 num">{rp(x.sisaAmt)}</td>
                  <td className="border px-2 py-1 text-center text-xs">{x.status === "none" ? "Belum direncanakan" : x.status === "partial" ? "Sebagian" : "Selesai"}</td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={10} className="border px-2 py-3 text-center text-sm text-muted-foreground">Tidak ada sisa anggaran — semua item sudah direncanakan.</td></tr>}
            </tbody>
          </table>
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
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}


