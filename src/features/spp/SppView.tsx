import { useEffect, useMemo, useState } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { idb, idbAll, bustCache, peekCache, rememberCache, type PajakManual } from "@/lib/storage/idb";
import { readSppFile, type SppRec } from "@/lib/sppFile";
import { vt } from "@/lib/engine/util";
import { rp, tgl } from "@/lib/engine/format";
import { download } from "@/lib/csv";
import { downloadBase64, patchSpp, serverStatus } from "@/lib/sppServer";
import { writeJsonToFolder } from "@/lib/storage/fsdir";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Button } from "@/components/ui/button";
import { DanaBadge } from "@/components/ui/dana-badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buktiKeKwitansi, KwitansiPengeluaran, PratinjauCetak, renderSppTemplate, type SppTemplate, type SppTemplateData } from "@/features/kwitansi";
import { createPortal } from "react-dom";
import { Printer, Wallet } from "lucide-react";
import type { KwitansiData } from "@/features/kwitansi";
import type { Row } from "@/types/smd";
import { villageIdentity } from "@/lib/engine/identity";
import { rekName } from "@/features/rpd/print";

const linkOf = (v: unknown) => {
  const t = vt(v).replace(/^tps:\/\//i, "https://");
  const m = /https?:\/\/[^\s#]+/i.exec(t);
  return m ? m[0] : "";
};

export default function SppView() {
  const { flat, tables } = useSmdStore();
  const { confirmNode, confirm } = useConfirm();
  const [spp, setSpp] = useState<SppRec | null>(() => peekCache<SppRec>("src:spp") ?? null);
  const [edits, setEdits] = useState<Map<string, { id: string; table: string; keys: Record<string, string>; fields: Record<string, { orig: unknown; edit: unknown }>; updatedAt: string }>>(() => peekCache("edits:all") ?? new Map());
  const [dana, setDana] = useState("");
  const [penerima, setPenerima] = useState("");
  const [kegFilter, setKegFilter] = useState("");
  const [triwulan, setTriwulan] = useState("");
  const [search, setSearch] = useState("");
  const [editCtx, setEditCtx] = useState<{ table: string; keys: Record<string, string> } | null>(null);
  const [srvOnline, setSrvOnline] = useState<boolean | null>(null);
  const [patchBusy, setPatchBusy] = useState(false);
  const [smdPassword, setSmdPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [printAwal, setPrintAwal] = useState<KwitansiData | null>(null);
  const [printBatch, setPrintBatch] = useState<KwitansiData[] | null>(null);
  const [printJadi, setPrintJadi] = useState<KwitansiData | KwitansiData[] | null>(null);
  const [printTemplate, setPrintTemplate] = useState<SppTemplate>("spp-1");
  const [printSppData, setPrintSppData] = useState<SppTemplateData | undefined>(undefined);
  const [msg, setMsg] = useState("");

  const loadEdits = async () => {
    const db = await idb();
    const rows = (await db.getAll("sppEdits")) as Array<{ id: string; table: string; keys: Record<string, string>; fields: Record<string, { orig: unknown; edit: unknown }>; updatedAt: string }>;
    const m = new Map(rows.map((e) => [e.id, e]));
    rememberCache("edits:all", m);
    setEdits(m);
  };

  useEffect(() => {
    void loadEdits();
    // restore SPP dari IndexedDB (cat awal dari cache memori agar tak berkedip)
    void idb().then(async (db) => {
      const rec = (await db.get("sourceFiles", "spp")) as (SppRec & { savedAt?: number }) | undefined;
      rememberCache("src:spp", rec ?? null);
      if (rec) setSpp(rec);
    });
    void refreshServer();
  }, []);

  const processFile = async (file: File) => {
    setMsg("Membaca file SPP…");
    try {
      const rec = await readSppFile(file);
      setSpp(rec);
      setMsg(`${file.name}: ${rec.reg.length.toLocaleString("id-ID")} SPP, ${rec.bukti.length.toLocaleString("id-ID")} kwitansi.`);
      toast.success(`File SPP dimuat — ${rec.reg.length} SPP, ${rec.bukti.length} kwitansi.`);
    } catch (e) {
      const msg = "Gagal membaca file SPP: " + (e instanceof Error ? e.message : String(e));
      setMsg(msg);
      toast.error(msg, { duration: Infinity });
    }
  };

  const buktiBySpp = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const b of spp?.bukti ?? []) {
      const k = vt(b.No_SPP);
      const arr = m.get(k);
      if (arr) arr.push(b);
      else m.set(k, [b]);
    }
    return m;
  }, [spp]);

  const potByBukti = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const p of spp?.pot ?? []) {
      const k = `${vt(p.No_SPP)}¦${vt(p.No_Bukti)}`;
      const arr = m.get(k);
      if (arr) arr.push(p);
      else m.set(k, [p]);
    }
    return m;
  }, [spp]);

  // Terapkan overlay edit
  const appliedReg = useMemo(() => {
    if (!spp) return [];
    return spp.reg.map((s) => {
      const e = edits.get(`spp:${vt(s.No_SPP)}`);
      if (!e) return s;
      const ns = { ...s };
      for (const [f, rec] of Object.entries(e.fields)) if (vt(s[f]) === vt(rec.orig)) ns[f] = rec.edit;
      return ns;
    });
  }, [spp, edits]);

  const appliedBukti = useMemo(() => {
    if (!spp) return [];
    return spp.bukti.map((b) => {
      const id = `bukti:${vt(b.No_SPP)}¦${vt(b.No_Bukti)}`;
      const e = edits.get(id);
      if (!e) return b;
      const nb = { ...b };
      for (const [f, rec] of Object.entries(e.fields)) if (vt(b[f]) === vt(rec.orig)) nb[f] = rec.edit;
      return nb;
    });
  }, [spp, edits]);

  const danaOpts = useMemo(() => [...new Set(appliedBukti.map((b) => vt(b.Sumberdana).trim()).filter(Boolean))].sort(), [appliedBukti]);
  const penerimaOpts = useMemo(() => [...new Set(appliedBukti.map((b) => vt(b.Nm_Penerima).trim()).filter(Boolean))].sort(), [appliedBukti]);
  const kegOpts = useMemo(() => {
    const nameByKd = new Map<string, string>();
    for (const r of flat) if (!r.Pseudo && !nameByKd.has(r.Kd_Keg)) nameByKd.set(r.Kd_Keg, r.Nama_Kegiatan || r.Kd_Keg);
    return [...new Set((spp?.bukti ?? []).map((b) => vt(b.Kd_Keg).trim()).filter(Boolean))]
      .sort()
      .map((kd) => ({ kd, name: nameByKd.get(kd) || kd }));
  }, [spp, flat]);

  const sppQuarter = (v: unknown) => {
    const d = vt(v);
    if (!d || d.length < 7) return 0;
    const m = parseInt(d.slice(5, 7), 10) || 0;
    return m >= 1 && m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : m <= 12 ? 4 : 0;
  };

  const list = useMemo(() => {
    if (!spp) return [];
    let rows = [...appliedReg].sort((a, b) => vt(a.Tgl_SPP).localeCompare(vt(b.Tgl_SPP)) || vt(a.No_SPP).localeCompare(vt(b.No_SPP)));
    const q = search.trim().toLowerCase();
    rows = rows.filter((s) => {
      if (q && !(vt(s.No_SPP) + " " + vt(s.Keterangan)).toLowerCase().includes(q)) return false;
      if (triwulan && sppQuarter(s.Tgl_SPP) !== Number(triwulan)) return false;
      if (dana || penerima || kegFilter) {
        const kws = (buktiBySpp.get(vt(s.No_SPP)) ?? []).filter(
          (b) => (!dana || vt(b.Sumberdana) === dana) && (!penerima || vt(b.Nm_Penerima) === penerima) && (!kegFilter || vt(b.Kd_Keg) === kegFilter),
        );
        if (!kws.length) return false;
      }
      return true;
    });
    return rows;
  }, [spp, appliedReg, buktiBySpp, dana, penerima, kegFilter, triwulan, search]);

  const totalJumlah = list.reduce((s, r) => s + Number(r.Jumlah) || 0, 0);
  const kdDesa = flat[0]?.Kd_Desa;

  const totalKwitansi = spp ? spp.bukti.length : 0;
  const totalPajak = useMemo(() => (spp?.pot ?? []).reduce((s, p) => s + (Number(p.Nilai) || 0), 0), [spp]);
  const nominalPerDana = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of appliedBukti) {
      const k = vt(b.Sumberdana).trim() || "(tanpa sumber dana)";
      m.set(k, (m.get(k) ?? 0) + (Number(b.Nilai) || 0));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [appliedBukti]);

  const saveEdit = async (table: string, keys: Record<string, string>, fields: Record<string, { orig: unknown; edit: unknown }>) => {
    const id = table === "Ta_SPP" ? `spp:${keys.No_SPP}` : `bukti:${keys.No_SPP}¦${keys.No_Bukti}`;
    const db = await idb();
    const m = new Map(edits);
    if (!Object.keys(fields).length) {
      await db.delete("sppEdits", id);
      m.delete(id);
      rememberCache("edits:all", m);
      setEdits(m);
      toast.success("Edit dihapus — kembali ke data .SMD.");
      setEditCtx(null);
      return;
    }
    const rec = { id, table, keys, fields, updatedAt: new Date().toISOString() };
    await db.put("sppEdits", rec);
    m.set(id, rec);
    rememberCache("edits:all", m);
    setEdits(m);
    toast.success("Edit disimpan.");
    setEditCtx(null);
  };

  const isoTanggal = (v: unknown): string => {
    const d = vt(v);
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
  };

  /** Susun data template SPP dari record SPP + flat RAB untuk satu No SPP. */
  const buildSppTemplateData = (noSpp: string): SppTemplateData | null => {
    if (!spp || !tables) return null;
    const regRow = appliedReg.find((r) => vt(r.No_SPP) === noSpp);
    if (!regRow) return null;
    const kws = buktiBySpp.get(noSpp) ?? [];
    const ident = villageIdentity(tables);
    const tahun = vt(regRow.Tgl_SPP) ? parseInt(vt(regRow.Tgl_SPP).slice(0, 4), 10) : undefined;
    const tanggal = isoTanggal(vt(regRow.Tgl_SPP));

    // Bidang / subBidang / kegiatan dari flat RAB (berdasarkan Kd_Keg pertama yang ditemukan)
    const kegKode = kws.length > 0 ? vt(kws[0].Kd_Keg) : "";
    const fr = flat.find((r) => !r.Pseudo && r.Kd_Keg === kegKode);

    // Rincian belanja: group flat rows per Kd_Rincian dalam kegiatan yang sama
    const byRincian = new Map<string, { kode: string; uraian: string; pagu: number; skrg: number }>();
    for (const r of flat) {
      if (r.Pseudo || r.Kd_Keg !== kegKode) continue;
      const kd = vt(r.Kd_Rincian);
      const existing = byRincian.get(kd);
      const skrg = Number(r.AnggaranStlhPAK ?? r.AnggaranPAK ?? r.Anggaran ?? 0);
      if (existing) {
        existing.skrg += skrg;
      } else {
        byRincian.set(kd, {
          kode: kd,
          uraian: vt(r.Nama_Rincian) || "-",
          pagu: Number(r.AnggaranStlhPAK ?? r.Anggaran ?? 0),
          skrg,
        });
      }
    }
    const rincian = Array.from(byRincian.values()).map((r) => ({
      kode: r.kode,
      uraian: r.uraian,
      pagu: r.pagu,
      lalu: 0,
      skrg: r.skrg,
      jml: r.skrg,
      sisa: r.pagu - r.skrg,
    }));

    const ttd = [
      { aksi: "Disetujui untuk dibayarkan", jabatan: `KEPALA DESA ${ident.desa}`, nama: ident.kades || "-" },
      { aksi: "Telah dibayar lunas", jabatan: `KEPALA URUSAN KEUANGAN DESA ${ident.desa}`, nama: ident.kaur || "-" },
      { aksi: "Telah dilakukan verifikasi", jabatan: `SEKRETARIS DESA ${ident.desa}`, nama: ident.sekdes || "-" },
    ];

    const penerimaDetail = kws.map((b) => ({
      nama: vt(b.Nm_Penerima),
      alamat: ident.desa,
      bukti: vt(b.No_Bukti),
      uraian: vt(b.Keterangan),
      rekening: rekName(vt(b.Kd_Rincian)) || vt(b.Kd_Rincian) || "-",
      jumlah: Number(b.Nilai) || 0,
    }));

    return {
      nomor: vt(regRow.No_SPP),
      desa: ident.desa,
      kabupaten: ident.kecamatan || "KOTABARU",
      tahun,
      perdes: { nomor: "-", tanggal: "-" },
      bidang: fr?.Nama_Bidang || "-",
      subBidang: fr?.Nama_SubBidang || "-",
      kegiatan: fr?.Nama_Kegiatan || kegKode || "-",
      waktu: "-",
      keperluan: vt(regRow.Keterangan),
      tanggal: tanggal ? `${ident.desa}, ${tanggal}` : "-",
      pelaksana: ident.kaur || "-",
      rincian,
      ttd,
      penerimaDetail,
      cetak: {},
    };
  };

  const bukaCetak = (noSpp: string, noBukti: string) => {
    if (!spp) return;
    const b = spp.bukti.find((x) => vt(x.No_SPP) === noSpp && vt(x.No_Bukti) === noBukti);
    if (!b) return;
    const pots = potByBukti.get(`${noSpp}¦${noBukti}`) ?? [];
    const fr = flat.find((r) => !r.Pseudo && r.Kd_Keg === vt(b.Kd_Keg));
    const kw = buktiKeKwitansi(b, pots, tables, fr?.Nama_Kegiatan || vt(b.Kd_Keg), fr?.ID_Keg || vt(b.Kd_Keg));
    const sppData = buildSppTemplateData(noSpp);
    setPrintSppData(sppData ?? undefined);
    setPrintAwal(kw);
  };

  const bukaCetakSemua = (noSpp: string) => {
    if (!spp) return;
    const kws = buktiBySpp.get(noSpp) ?? [];
    if (!kws.length) return;
    const daftar = kws.map((b) => {
      const noBukti = vt(b.No_Bukti);
      const pots = potByBukti.get(`${noSpp}¦${noBukti}`) ?? [];
      const fr = flat.find((r) => !r.Pseudo && r.Kd_Keg === vt(b.Kd_Keg));
      return buktiKeKwitansi(b, pots, tables, fr?.Nama_Kegiatan || vt(b.Kd_Keg), fr?.ID_Keg || vt(b.Kd_Keg));
    });
    const sppData = buildSppTemplateData(noSpp);
    setPrintSppData(sppData ?? undefined);
    setPrintBatch(daftar);
  };

  const refreshServer = async () => {
    const st = await serverStatus();
    setSrvOnline(!!st?.ok);
  };

  const buildToolEdits = (): Array<{ table: string; keys: Record<string, string>; sets: Record<string, unknown> }> => {
    if (!spp) return [];
    // Format persis seperti yang dibaca tools/spp_patch.mjs: {table, keys, sets},
    // hanya field yang nilainya masih sama dengan hasil edit (tercermin di data).
    const editsArr: Array<{ table: string; keys: Record<string, string>; sets: Record<string, unknown> }> = [];
    const regMap = new Map(appliedReg.map((s) => [vt(s.No_SPP), s]));
    const buktiMap = new Map(appliedBukti.map((b) => [`${vt(b.No_SPP)}¦${vt(b.No_Bukti)}`, b]));
    for (const e of edits.values()) {
      const row = e.table === "Ta_SPP"
        ? regMap.get(e.keys.No_SPP)
        : buktiMap.get(`${e.keys.No_SPP}¦${e.keys.No_Bukti}`);
      if (!row) continue;
      const sets: Record<string, unknown> = {};
      for (const [f, r] of Object.entries(e.fields)) {
        if (vt(row[f]) === vt(r.edit)) sets[f] = r.edit;
      }
      if (Object.keys(sets).length) editsArr.push({ table: e.table, keys: e.keys, sets });
    }
    return editsArr;
  };

  /** Jalur utama: kirim ke server lokal -> unduh .smd hasil langsung. */
  const exportDirect = async () => {
    if (!spp) return;
    const editsArr = buildToolEdits();
    const buktiByKey = new Map((spp?.bukti ?? []).map((b) => [`${vt(b.No_SPP)}¦${vt(b.No_Bukti)}`, b]));
    const inserts = (spp ? await idbAll<PajakManual>("pajakManual", spp.name) : []).map((m) => {
      const b = buktiByKey.get(`${m.noSpp}¦${m.noBukti}`);
      return {
        table: "Ta_SPPPot",
        values: {
          Tahun: vt(b?.Tahun), Kd_Desa: vt(b?.Kd_Desa), No_SPP: m.noSpp, Kd_Keg: m.kdKeg,
          No_Bukti: m.noBukti, Kd_Rincian: m.kdRincian, Nilai: m.nilai, Billing_Pajak: m.billing,
        },
      };
    });
    if (!editsArr.length && !inserts.length) {
      setMsg("Tidak ada edit yang tersimpan.");
      toast.info("Tidak ada edit yang tersimpan.");
      return;
    }
    if (!spp.raw) {
      const msg = "File asli tidak tersimpan di browser (data lama). Pilih ulang file SPP .SMD, lalu ekspor lagi.";
      setMsg(msg);
      toast.warning(msg);
      return;
    }
    setPatchBusy(true);
    setMsg("Mengirim ke server lokal…");
    try {
      const r = await patchSpp({
        fileName: spp.name,
        smdBase64: spp.raw,
        edits: editsArr,
        inserts: inserts.length ? inserts : undefined,
        password: smdPassword || undefined,
      });
      if (!r.ok) {
        if (/password/i.test(r.error || "")) setNeedPassword(true);
        const msg = "Gagal: " + (r.error || "server mengembalikan error.");
        setMsg(msg);
        toast.error(msg, { duration: Infinity });
        return;
      }
      setNeedPassword(false);
      downloadBase64(r.outName || "spp-perbaikan.smd", r.smdBase64 || "");
      const peringatan = (r.mismatches || []).length ? ` PERINGATAN: ${(r.mismatches || []).join("; ")}` : "";
      const insInfo = typeof r.inserted === "number" && r.inserted ? ` + ${r.inserted} baris pajak baru` : "";
      setMsg(`Selesai: ${r.applied}/${editsArr.length} diterapkan${insInfo}, ${r.verified} terverifikasi. File ${r.outName} terunduh - impor ke Siskeudes.${peringatan}`);
      toast.success("Ekspor selesai — berkas .smd terunduh.");
    } catch (e) {
      const msg = "Gagal menghubungi server: " + (e instanceof Error ? e.message : String(e));
      setMsg(msg);
      toast.error(msg, { duration: Infinity });
      setSrvOnline(false);
    } finally {
      setPatchBusy(false);
    }
  };

  /** Jalur cadangan (server mati): tulis JSON ke folder export/json untuk .bat. */
  const exportJsonFolder = async () => {
    if (!spp) return;
    const editsArr = buildToolEdits();
    if (!editsArr.length) {
      setMsg("Tidak ada edit yang tersimpan.");
      toast.info("Tidak ada edit yang tersimpan.");
      return;
    }
    const payload = { tool: "asistenkeu-spp-patch", version: 1, sourceFile: spp.name, exportedAt: new Date().toISOString(), edits: editsArr };
    const nama = spp.name.replace(/\.smd$/i, "") + ".edit.json";
    const json = JSON.stringify(payload, null, 2);
    const keFolder = await writeJsonToFolder(nama, json);
    if (keFolder.ok) {
      setMsg(`Tersimpan di folder "${keFolder.dir || "export/json"}" (${editsArr.length} baris). Klik 2× tools/terapkan_spp.bat → hasil di export/smd/.`);
      toast.success(`Tersimpan di folder "${keFolder.dir || "export/json"}".`);
    } else {
      download(nama, json, "application/json;charset=utf-8");
      setMsg(`Diunduh (${editsArr.length} baris). Pindahkan ke folder export/json proyek lama, lalu klik 2× tools/terapkan_spp.bat.`);
      toast.success("Berkas JSON terunduh.");
    }
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Register SPP</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Surat permintaan pembayaran dan kwitansi dari file SPP Siskeudes.</p>
      </div>
      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
              {spp ? "Ganti file SPP .SMD" : "Pilih file SPP .SMD"}
              <input type="file" accept=".smd,.SMD" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); e.target.value = ""; }} />
            </label>
            {spp && <span className="text-xs text-muted-foreground">{spp.name} · {spp.nSpp.toLocaleString("id-ID")} SPP · {spp.bukti.length.toLocaleString("id-ID")} kwitansi</span>}
            {spp && (
              <button type="button" className="text-xs text-muted-foreground underline" onClick={refreshServer} title="Cek ulang server lokal">
                {srvOnline === null ? "cek server…" : srvOnline ? "server lokal aktif" : "server lokal mati - pakai mode JSON"}
              </button>
            )}
          </div>
          {spp && (
            <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Ekspor</span>
              {srvOnline ? (
                <Button size="sm" variant="default" disabled={patchBusy} onClick={exportDirect}>
                  {patchBusy ? "Memproses…" : "Ekspor Register SPP (.smd)"}
                </Button>
              ) : (
                <Button size="sm" variant="default" onClick={exportJsonFolder}>Ekspor Register SPP (.smd)</Button>
              )}
              {!!edits.size && (
                <Button size="sm" variant="outline" onClick={exportJsonFolder}>Ekspor JSON</Button>
              )}
              {edits.size > 0 && <Button size="sm" variant="outline" onClick={async () => { if (!(await confirm({ title: "Hapus semua edit lokal?", description: "Perubahan yang belum diekspor ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return; const db = await idb(); await db.clear("sppEdits"); bustCache("edits:all"); setEdits(new Map()); toast.success("Semua edit lokal dihapus."); }}>Hapus semua edit</Button>}
              {needPassword && (
                <label className="flex items-center gap-1 text-xs">Password Jet:
                  <Input className="h-7 w-40 text-xs" type="password" value={smdPassword} onChange={(e) => setSmdPassword(e.target.value)} placeholder="opsional" />
                </label>
              )}
            </div>
          )}
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      {!spp && <p className="text-sm text-muted-foreground">File SPP belum dimuat. Pilih file SPP .SMD dari Siskeudes.</p>}

      {spp && (
        <>
          {/* KPI ringkasan */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total nominal SPP</div><div className="truncate font-mono text-3xl font-medium tabular-nums" title={rp(totalJumlah)}>{rp(totalJumlah)}</div><div className="text-xs text-muted-foreground">{list.length} SPP</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total SPP</div><div className="font-mono text-3xl font-medium tabular-nums">{list.length.toLocaleString("id-ID")}</div><div className="text-xs text-muted-foreground">dari {spp.reg.length.toLocaleString("id-ID")} di file</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total kwitansi</div><div className="font-mono text-3xl font-medium tabular-nums">{totalKwitansi.toLocaleString("id-ID")}</div><div className="text-xs text-muted-foreground">SPPBukti</div></CardContent></Card>
            <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total pajak</div><div className="truncate font-mono text-3xl font-medium tabular-nums" title={rp(totalPajak)}>{rp(totalPajak)}</div><div className="text-xs text-muted-foreground">potongan</div></CardContent></Card>
          </div>

          {/* Nominal per sumber dana */}
          {nominalPerDana.length > 0 && (
  <Card className="overflow-hidden">
    <CardHeader className="border-b bg-muted/30 px-4 py-3">
      <CardTitle className="text-sm font-semibold">
        Nominal per sumber dana
      </CardTitle>
    </CardHeader>

    <CardContent className="p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nominalPerDana.map(([sd, v]) => (
          <div
            key={sd}
            className="group rounded-none border-2 bg-background p-4 transition-all hover:border-primary/30 hover:bg-muted/30"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>

              <span className="text-xs font-medium text-muted-foreground">
                {sd}
              </span>
            </div>

            <p className="text-lg font-bold tracking-tight">
              {rp(v)}
            </p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              <span>Sumber dana</span>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={dana} onChange={(e) => setDana(e.target.value)}>
                <option value="">Semua sumber dana</option>
                {danaOpts.map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              <span>Penerima</span>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={penerima} onChange={(e) => setPenerima(e.target.value)}>
                <option value="">Semua penerima</option>
                {penerimaOpts.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              <span>Kegiatan</span>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={kegFilter} onChange={(e) => setKegFilter(e.target.value)}>
                <option value="">Semua kegiatan</option>
                {kegOpts.map((k) => <option key={k.kd} value={k.kd}>{k.name}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              <span>Triwulan</span>
              <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={triwulan} onChange={(e) => setTriwulan(e.target.value)}>
                <option value="">Semua</option>
                <option value="1">Triwulan I</option>
                <option value="2">Triwulan II</option>
                <option value="3">Triwulan III</option>
                <option value="4">Triwulan IV</option>
              </select>
            </label>
            <label className="block space-y-1 text-xs font-medium text-muted-foreground">
              <span>Cari SPP</span>
              <Input className="h-9 w-full text-sm" placeholder="No SPP / uraian…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>
          <div className="text-xs text-muted-foreground">{list.length} SPP · total {rp(totalJumlah)}</div>

          <div className="space-y-1">
            {list.map((s) => {
              const noS = vt(s.No_SPP);
              const edited = [...edits.values()].some((e) => e.keys.No_SPP === noS);
              const kws = buktiBySpp.get(noS) ?? [];
              return (
                <details key={noS} className="rounded-md border">
                  <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">{tgl(s.Tgl_SPP)}</span>
                    <b>{noS}</b>
                    <span className="flex-1 truncate">{vt(s.Keterangan)}</span>
                    {edited && <span className="rounded-sm bg-warning-soft px-1.5 text-xs font-medium text-warning">Diedit</span>}
                    <span className="font-semibold">{rp(Number(s.Jumlah) || 0)}</span>
                    {kws.length > 0 && (
                      <button type="button" className="rounded border px-1.5 text-xs" title={`Cetak ${kws.length} kwitansi SPP ini`} onClick={(e) => { e.preventDefault(); bukaCetakSemua(noS); }}><Printer className="size-3" /></button>
                    )}
                    <button type="button" className="rounded border px-1.5 text-xs" title="Ubah baris SPP" aria-label="Ubah baris SPP" onClick={(e) => { e.preventDefault(); setEditCtx({ table: "Ta_SPP", keys: { No_SPP: noS } }); }}>✎</button>
                  </summary>
                  <div className="px-3 pb-2">
                    {kws.map((b) => {
                      const id = `bukti:${noS}¦${vt(b.No_Bukti)}`;
                      const e = edits.get(id);
                      const nb = appliedBukti.find((x) => vt(x.No_SPP) === noS && vt(x.No_Bukti) === vt(b.No_Bukti)) ?? b;
                      const pots = potByBukti.get(`${noS}¦${vt(b.No_Bukti)}`) ?? [];
                      return (
                        <div key={vt(b.No_Bukti)} className="mb-1.5 rounded-none border-2 border-l-4 border-l-primary/70 bg-card p-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{vt(nb.No_Bukti)}</span>
                            <span className="flex-1 font-medium">{vt(nb.Keterangan)} — {vt(nb.Nm_Penerima)}</span>
                            {e && <span className="rounded-sm bg-warning-soft px-1.5 text-xs font-medium text-warning">Diedit</span>}
                            <span className="font-semibold">{rp(Number(nb.Nilai) || 0)}</span>
                            <button type="button" className="rounded border px-1.5" title="Cetak kwitansi" onClick={() => bukaCetak(noS, vt(b.No_Bukti))}><Printer className="size-3" /></button>
                            <button type="button" className="rounded border px-1.5" onClick={() => setEditCtx({ table: "Ta_SPPBukti", keys: { No_SPP: noS, No_Bukti: vt(b.No_Bukti) } })}>✎</button>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                            <span>Tgl {tgl(nb.Tgl_Bukti)}</span>
                            <DanaBadge value={vt(nb.Sumberdana)} />
                            {linkOf(nb.link_bukti) && <a className="text-primary underline" href={linkOf(nb.link_bukti)} target="_blank" rel="noreferrer">bukti</a>}
                          </div>
                          {pots.map((p, pi) => (
                            <div key={pi} className="ml-3 mt-0.5 text-muted-foreground">• {vt(p.Kd_Rincian) || "Potongan"}: <b>{rp(Number(p.Nilai) || 0)}</b>{vt(p.Billing_Pajak) ? ` · billing ${vt(p.Billing_Pajak)}` : ""}</div>
                          ))}
                        </div>
                      );
                    })}
                    {!kws.length && <div className="py-1 text-xs text-muted-foreground">Tidak ada kwitansi untuk SPP ini di file.</div>}
                  </div>
                </details>
              );
            })}
          </div>
        </>
      )}

      {/* Dialog edit */}
      <Dialog open={editCtx !== null} onOpenChange={(o) => !o && setEditCtx(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editCtx?.table === "Ta_SPP" ? "Edit SPP" : "Edit Kwitansi"}</DialogTitle></DialogHeader>
          {editCtx && spp && (
            <SppEditForm
              ctx={editCtx}
              row={editCtx.table === "Ta_SPP" ? appliedReg.find((r) => vt(r.No_SPP) === editCtx.keys.No_SPP) ?? null : appliedBukti.find((r) => vt(r.No_SPP) === editCtx.keys.No_SPP && vt(r.No_Bukti) === editCtx.keys.No_Bukti) ?? null}
              base={editCtx.table === "Ta_SPP" ? spp.reg.find((r) => vt(r.No_SPP) === editCtx.keys.No_SPP) ?? null : spp.bukti.find((r) => vt(r.No_SPP) === editCtx.keys.No_SPP && vt(r.No_Bukti) === editCtx.keys.No_Bukti) ?? null}
              onSave={(fields) => saveEdit(editCtx.table, editCtx.keys, fields)}
            />
          )}
        </DialogContent>
      </Dialog>
      <span className="hidden">{kdDesa}</span>

      {printAwal && (
        <PratinjauCetak
          open={printAwal !== null}
          onOpenChange={(o) => !o && setPrintAwal(null)}
          awal={printAwal}
          sppData={printSppData}
          onCetak={(d, tmpl) => {
            setPrintAwal(null);
            setPrintTemplate(tmpl);
            setPrintJadi(d);
            setTimeout(() => window.print(), 350);
          }}
        />
      )}
      {printBatch && (
        <PratinjauCetak
          open={printBatch !== null}
          onOpenChange={(o) => !o && setPrintBatch(null)}
          banyak={printBatch}
          sppData={printSppData}
          onCetakBanyak={(ds, tmpl) => {
            setPrintBatch(null);
            setPrintTemplate(tmpl);
            setPrintJadi(ds);
            setTimeout(() => window.print(), 350);
          }}
        />
      )}
      {printJadi && printSppData && (
        createPortal(
          <div id="kwt-print-root">
            {renderSppTemplate({
              template: printTemplate,
              d: printSppData,
              kwitansis: Array.isArray(printJadi) ? printJadi : [printJadi],
            })}
          </div>,
          document.body,
        ))}
      {printJadi && !printSppData && (
        createPortal(
          <div id="kwt-print-root">
            {Array.isArray(printJadi) ? (
              printJadi.map((d) => <KwitansiPengeluaran key={d.nomor} data={d} />)
            ) : (
              <KwitansiPengeluaran data={printJadi} />
            )}
          </div>,
          document.body,
        ))}
    </div>
  );
}

function SppEditForm({ ctx, row, base, onSave }: { ctx: { table: string; keys: Record<string, string> }; row: Row | null; base: Row | null; onSave: (fields: Record<string, { orig: unknown; edit: unknown }>) => void }) {
  const fields = ctx.table === "Ta_SPP" ? ["Keterangan", "Jumlah"] : ["Nm_Penerima", "Keterangan", "Tgl_Bukti", "Nilai", "Sumberdana", "link_bukti"];
  const shown = row ?? base;
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f, shown ? vt(shown[f]) : ""])));
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const out: Record<string, { orig: unknown; edit: unknown }> = {}; for (const f of fields) { if (vals[f] !== vt(base?.[f])) out[f] = { orig: base?.[f], edit: f === "Nilai" || f === "Jumlah" ? Number(vals[f]) || 0 : vals[f] }; } onSave(out); }}>
      {fields.map((f) => (
        <label key={f} className="block text-xs">{f}
          <Input className="mt-1" value={vals[f]} onChange={(e) => setVals({ ...vals, [f]: e.target.value })} />
        </label>
      ))}
      <Button type="submit" size="sm">Simpan</Button>
    </form>
  );
}

