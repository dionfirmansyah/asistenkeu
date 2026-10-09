import { useEffect, useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { idb, idbAll, idbDel, idbPut, newId, type PajakManual } from "@/lib/storage/idb";
import { vt } from "@/lib/engine/util";
import { rp } from "@/lib/engine/format";
import { download } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { ComboboxField } from "@/components/ui/combobox";
import type { Row } from "@/types/smd";

interface BarisPajak {
  key: string;
  noSpp: string;
  noBukti: string;
  kdKeg: string;
  namaKeg: string;
  kdRincian: string;
  nilai: number;
  billing: string;
  penerima: string;
  tglBukti: string;
  sumberDana: string;
  manual: boolean;
  manualId?: string;
}

const tglID = (v: unknown) => {
  const d = vt(v);
  return d && d.length >= 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "";
};
const quarter = (v: unknown) => {
  const d = vt(v);
  if (!d || d.length < 7) return 0;
  const m = parseInt(d.slice(5, 7), 10) || 0;
  return m >= 1 && m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : m <= 12 ? 4 : 0;
};

export default function RekapPajakView() {
  const { flat } = useSmdStore();
  const [spp, setSpp] = useState<{ name: string; bukti: Row[]; pot: Row[]; reg: Row[] } | null>(null);
  const [manual, setManual] = useState<PajakManual[]>([]);
  const [jenis, setJenis] = useState("");
  const [noSpp, setNoSpp] = useState("");
  const [triwulan, setTriwulan] = useState("");
  const [sumber, setSumber] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const reload = async () => {
    const db = await idb();
    const rec = (await db.get("sourceFiles", "spp")) as typeof spp | undefined;
    if (rec) {
      setSpp(rec);
      setManual(await idbAll<PajakManual>("pajakManual", rec.name));
    }
  };
  useEffect(() => { void reload(); }, []);

  const namaKeg = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of flat) if (!r.Pseudo && !m.has(r.Kd_Keg)) m.set(r.Kd_Keg, r.Nama_Kegiatan || r.Kd_Keg);
    return m;
  }, [flat]);

  const buktiMap = useMemo(() => {
    const m = new Map<string, Row>();
    for (const b of spp?.bukti ?? []) m.set(`${vt(b.No_SPP)}¦${vt(b.No_Bukti)}`, b);
    return m;
  }, [spp]);

  const rows: BarisPajak[] = useMemo(() => {
    const out: BarisPajak[] = [];
    for (const p of spp?.pot ?? []) {
      const b = buktiMap.get(`${vt(p.No_SPP)}¦${vt(p.No_Bukti)}`);
      const kdKeg = vt(p.Kd_Keg) || (b ? vt(b.Kd_Keg) : "");
      out.push({
        key: `file:${vt(p.No_SPP)}¦${vt(p.No_Bukti)}¦${vt(p.Kd_Rincian)}¦${Number(p.Nilai) || 0}`,
        noSpp: vt(p.No_SPP), noBukti: vt(p.No_Bukti), kdKeg,
        namaKeg: namaKeg.get(kdKeg) || kdKeg,
        kdRincian: vt(p.Kd_Rincian), nilai: Number(p.Nilai) || 0,
        billing: vt(p.Billing_Pajak),
        penerima: b ? vt(b.Nm_Penerima) : "", tglBukti: b ? vt(b.Tgl_Bukti) : "",
        sumberDana: b ? vt(b.Sumberdana) : "", manual: false,
      });
    }
    for (const m of manual) {
      const b = buktiMap.get(`${m.noSpp}¦${m.noBukti}`);
      out.push({
        key: `manual:${m.id}`, noSpp: m.noSpp, noBukti: m.noBukti, kdKeg: m.kdKeg,
        namaKeg: namaKeg.get(m.kdKeg) || m.kdKeg, kdRincian: m.kdRincian, nilai: m.nilai,
        billing: m.billing, penerima: b ? vt(b.Nm_Penerima) : "", tglBukti: b ? vt(b.Tgl_Bukti) : "",
        sumberDana: b ? vt(b.Sumberdana) : "", manual: true, manualId: m.id,
      });
    }
    return out.sort((a, b) => a.noSpp.localeCompare(b.noSpp, "id", { numeric: true }) || a.noBukti.localeCompare(b.noBukti));
  }, [spp, manual, buktiMap, namaKeg]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((x) => {
      if (jenis && x.kdRincian !== jenis) return false;
      if (noSpp && x.noSpp !== noSpp) return false;
      if (triwulan && quarter(x.tglBukti) !== Number(triwulan)) return false;
      if (sumber === "file" && x.manual) return false;
      if (sumber === "manual" && !x.manual) return false;
      if (q && !`${x.noSpp} ${x.noBukti} ${x.kdRincian} ${x.penerima} ${x.namaKeg} ${x.billing}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, jenis, noSpp, triwulan, sumber, search]);

  const totNilai = filtered.reduce((s, x) => s + x.nilai, 0);
  const jenisOpts = [...new Set(rows.map((x) => x.kdRincian).filter(Boolean))].sort();
  const sppOpts = [...new Set(rows.map((x) => x.noSpp))].sort();
  const billingOk = filtered.filter((x) => x.billing.trim()).length;

  const exportCsv = () => {
    const head = "No SPP,No Bukti,Kegiatan,Jenis Pajak,Nilai,Billing,Penerima,Tgl Bukti,Sumber";
    const lines = filtered.map((x) =>
      [x.noSpp, x.noBukti, `"${x.namaKeg.replace(/"/g, '""')}"`, x.kdRincian, x.nilai, x.billing, `"${x.penerima.replace(/"/g, '""')}"`, tglID(x.tglBukti), x.sumberDana].join(","),
    );
    download("rekap_pajak.csv", "﻿" + [head, ...lines].join("\r\n"), "text/csv;charset=utf-8");
  };

  if (!spp) {
    return (
      <p className="text-sm text-muted-foreground">
        Belum ada file SPP. Muat dulu di menu <b>Register SPP</b>, atau pakai file contoh di <b>Data Register SPP</b>.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Total pajak" value={rp(totNilai)} sub={`${filtered.length} baris`} />
        <Kpi label="Jenis pajak" value={String(jenisOpts.length)} sub={jenisOpts.join(", ") || "-"} />
        <Kpi label="Billing terisi" value={`${billingOk}/${filtered.length}`} sub="Billing_Pajak (e-Billing)" />
        <Kpi label="Input manual" value={String(manual.length)} sub="Menunggu ekspor .smd" />
      </div>

      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Filter label="Jenis pajak">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={jenis} onChange={(e) => setJenis(e.target.value)}>
                <option value="">Semua jenis</option>
                {jenisOpts.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </Filter>
            <Filter label="SPP">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={noSpp} onChange={(e) => setNoSpp(e.target.value)}>
                <option value="">Semua SPP</option>
                {sppOpts.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Filter>
            <Filter label="Triwulan">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={triwulan} onChange={(e) => setTriwulan(e.target.value)}>
                <option value="">Semua triwulan</option>
                <option value="1">Triwulan I</option>
                <option value="2">Triwulan II</option>
                <option value="3">Triwulan III</option>
                <option value="4">Triwulan IV</option>
              </select>
            </Filter>
            <Filter label="Sumber">
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={sumber} onChange={(e) => setSumber(e.target.value)}>
                <option value="">Semua</option>
                <option value="file">Dari file</option>
                <option value="manual">Input manual</option>
              </select>
            </Filter>
            <Filter label="Cari">
              <Input className="h-9 w-full text-sm" placeholder="SPP / penerima / billing…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </Filter>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => setFormOpen(true)}>+ Tambah data pajak</Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>Ekspor CSV</Button>
            <span className="text-xs text-muted-foreground">{filtered.length} baris · {rp(totNilai)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Rekap pajak ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-xs">
                <th className="border px-2 py-1 text-left">NO SPP</th>
                <th className="border px-2 py-1 text-left">NO BUKTI</th>
                <th className="border px-2 py-1 text-left">KEGIATAN</th>
                <th className="border px-2 py-1 text-left">JENIS PAJAK</th>
                <th className="border px-2 py-1 text-right">NILAI (Rp)</th>
                <th className="border px-2 py-1 text-left">BILLING</th>
                <th className="border px-2 py-1 text-left">PENERIMA</th>
                <th className="border px-2 py-1 text-left">TGL BUKTI</th>
                <th className="border px-2 py-1 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.key}>
                  <td className="border px-2 py-1 text-xs">{x.noSpp}</td>
                  <td className="border px-2 py-1 text-xs">{x.noBukti}</td>
                  <td className="border px-2 py-1">{x.namaKeg}</td>
                  <td className="border px-2 py-1">{x.kdRincian}</td>
                  <td className="border px-2 py-1 num">{rp(x.nilai)}</td>
                  <td className="border px-2 py-1 text-xs">{x.billing || <span className="text-muted-foreground">—</span>}</td>
                  <td className="border px-2 py-1">{x.penerima}</td>
                  <td className="border px-2 py-1 text-xs">{tglID(x.tglBukti)}</td>
                  <td className="border px-2 py-1 text-center">
                    {x.manual ? (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={async () => {
                        if (!x.manualId || !window.confirm("Hapus data pajak manual ini?")) return;
                        await idbDel("pajakManual", x.manualId);
                        await reload();
                      }}>Hapus</Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">File</span>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={9} className="border px-2 py-3 text-center text-sm text-muted-foreground">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah data pajak</DialogTitle></DialogHeader>
          <PajakForm
            sppOpts={sppOpts}
            buktiList={spp.bukti}
            jenisOpts={jenisOpts}
            namaKeg={namaKeg}
            fileName={spp.name}
            onSaved={async () => { setFormOpen(false); await reload(); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      <span className="uppercase tracking-wide">{label}</span>
      {children}
    </label>
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

function PajakForm({
  sppOpts, buktiList, jenisOpts, namaKeg, fileName, onSaved,
}: {
  sppOpts: string[];
  buktiList: Row[];
  jenisOpts: string[];
  namaKeg: Map<string, string>;
  fileName: string;
  onSaved: () => Promise<void>;
}) {
  const [noSpp, setNoSpp] = useState("");
  const [noBukti, setNoBukti] = useState("");
  const [kdRincian, setKdRincian] = useState(jenisOpts[0] ?? "");
  const [kdCustom, setKdCustom] = useState(false);
  const [nilai, setNilai] = useState(0);
  const [billing, setBilling] = useState("");
  const [err, setErr] = useState("");

  const kws = buktiList.filter((b) => !noSpp || vt(b.No_SPP) === noSpp);
  const kdKeg = kws.find((b) => vt(b.No_Bukti) === noBukti) ? vt(kws.find((b) => vt(b.No_Bukti) === noBukti)!.Kd_Keg) : "";

  const simpan = async () => {
    if (!noSpp || !noBukti) { setErr("Pilih SPP dan kwitansi."); return; }
    const kode = kdRincian.trim();
    if (!kode) { setErr("Isi kode jenis pajak."); return; }
    if (kode.length > 36) { setErr("Kode maksimal 36 karakter."); return; }
    if (billing.length > 50) { setErr("Billing maksimal 50 karakter."); return; }
    if (!(nilai > 0)) { setErr("Nilai harus lebih dari 0."); return; }
    if (!kdKeg) { setErr("Kwitansi tidak memiliki Kd_Keg."); return; }
    await idbPut("pajakManual", {
      id: newId("pj"), scope: fileName, fileName, noSpp, noBukti, kdKeg, kdRincian: kode,
      nilai: Math.round(nilai * 100) / 100, billing: billing.trim(), ts: Date.now(),
    });
    await onSaved();
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-xs font-medium">SPP
        <ComboboxField
          items={sppOpts.map((s) => ({ value: s, label: s }))}
          value={noSpp}
          onChange={(v) => { setNoSpp(v); setNoBukti(""); }}
          placeholder="Cari & pilih SPP…"
        />
      </label>
      <label className="block space-y-1 text-xs font-medium">Kwitansi
        <ComboboxField
          items={kws.map((b) => ({ value: vt(b.No_Bukti), label: `${vt(b.No_Bukti)} — ${vt(b.Nm_Penerima)} (${rp(Number(b.Nilai) || 0)})` }))}
          value={noBukti}
          onChange={setNoBukti}
          placeholder={noSpp ? "Pilih kwitansi…" : "Pilih SPP dulu…"}
          disabled={!noSpp}
        />
      </label>
      {kdKeg && <p className="text-xs text-muted-foreground">Kegiatan: <b>{namaKeg.get(kdKeg) || kdKeg}</b></p>}
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-xs font-medium">Jenis pajak
          {kdCustom ? (
            <Input className="h-9 text-sm" placeholder="cth: 7.1.1.01." value={kdRincian} onChange={(e) => setKdRincian(e.target.value)} />
          ) : (
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={kdRincian} onChange={(e) => (e.target.value === "__baru__" ? (setKdCustom(true), setKdRincian("")) : setKdRincian(e.target.value))}>
              {jenisOpts.map((j) => <option key={j} value={j}>{j}</option>)}
              <option value="__baru__">Kode lain…</option>
            </select>
          )}
        </label>
        <label className="block space-y-1 text-xs font-medium">Nilai (Rp)
          <MoneyInput value={nilai} onChange={setNilai} />
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">Billing e-Billing (opsional)
        <Input className="h-9 text-sm" value={billing} onChange={(e) => setBilling(e.target.value)} placeholder="cth: 042036264568365" />
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button size="sm" onClick={simpan}>Simpan</Button>
    </div>
  );
}
