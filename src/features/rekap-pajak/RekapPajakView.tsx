import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { idb, idbAll, idbDel, idbPut, newId, peekCache, rememberCache, type PajakManual } from "@/lib/storage/idb";
import { parsePajakBuffer, savePajakFile, type PajakFileRec } from "@/lib/pajakFile";
import { vt } from "@/lib/engine/util";
import { rp, tgl } from "@/lib/engine/format";
import { copyText, download } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { ComboboxField } from "@/components/ui/combobox";
import type { Row } from "@/types/smd";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";

const SAMPLE_PATH = "dataset/PAJAK_DESA_20261010.smd";
const SAMPLE_NAME = "PAJAK_DESA_20261010.smd";

type PajakFile = PajakFileRec;

interface BarisPajak {
  key: string;
  noSsp: string;
  tgl: string;
  keterangan: string;
  jenis: string;
  nilai: number;
  ntpn: string;
  noBukti: string;
  manual: boolean;
  manualId?: string;
}

/** Label jenis pajak: utamakan Jenis_Setoran dari file, fallback peta kode → nama. */
const JENIS_LABEL: Record<string, string> = {
  "7.1.1.01.": "PPN Dalam Negeri - Masa",
  "7.1.1.02.": "PPh Pasal 21 - Masa",
  "7.1.1.03.": "PPh Pasal 22 - Masa",
  "7.1.2.01.": "Pajak Daerah",
  "7.1.2.02.": "Pajak Galian C",
};
const jenisLabel = (kdRincian: string, jenisSetoran: string): string => {
  const s = jenisSetoran.trim();
  if (s) return s;
  const k = kdRincian.trim();
  return JENIS_LABEL[k] ?? k;
};

const quarter = (v: unknown) => {
  const d = vt(v);
  if (!d || d.length < 7) return 0;
  const m = parseInt(d.slice(5, 7), 10) || 0;
  return m >= 1 && m <= 3 ? 1 : m <= 6 ? 2 : m <= 9 ? 3 : m <= 12 ? 4 : 0;
};

export default function RekapPajakView() {
  const [file, setFile] = useState<PajakFile | null>(() => peekCache<PajakFile>("src:pajak") ?? null);
  const [manual, setManual] = useState<PajakManual[]>(() => {
    const f = peekCache<PajakFile>("src:pajak");
    return f ? (peekCache<PajakManual[]>(`manual:${f.name}`) ?? []) : [];
  });
  const [jenis, setJenis] = useState("");
  const [noSsp, setNoSsp] = useState("");
  const [triwulan, setTriwulan] = useState("");
  const [sumber, setSumber] = useState("");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadingSample, setLoadingSample] = useState(false);
  const { confirmNode, confirm } = useConfirm();

  const reload = async () => {
    const db = await idb();
    const rec = (await db.get("sourceFiles", "pajak")) as (PajakFile & { savedAt?: number }) | undefined;
    rememberCache("src:pajak", rec ? { name: rec.name, pajak: rec.pajak, rinci: rec.rinci } : null);
    if (rec) {
      setFile({ name: rec.name, pajak: rec.pajak, rinci: rec.rinci });
      const ms = await idbAll<PajakManual>("pajakManual", rec.name);
      rememberCache(`manual:${rec.name}`, ms);
      setManual(ms);
    }
  };
  useEffect(() => { void reload(); }, []);

  const saveFile = async (pf: PajakFile) => {
    setFile(pf);
    await savePajakFile(pf);
    const ms = await idbAll<PajakManual>("pajakManual", pf.name);
    rememberCache(`manual:${pf.name}`, ms);
    setManual(ms);
    setMsg(`${pf.name}: ${pf.pajak.length.toLocaleString("id-ID")} SSP pajak.`);
    toast.success(`File pajak dimuat — ${pf.pajak.length} SSP.`);
  };

  const processFile = async (f: File) => {
    setMsg("Membaca file pajak…");
    try {
      const pf = parsePajakBuffer(new Uint8Array(await f.arrayBuffer()), f.name);
      await saveFile(pf);
    } catch (e) {
      const msg = "Gagal membaca file pajak: " + (e instanceof Error ? e.message : String(e));
      setMsg(msg);
      toast.error(msg, { duration: Infinity });
    }
  };

  const loadSample = async () => {
    setLoadingSample(true);
    setMsg("Memuat file contoh…");
    try {
      const res = await fetch(SAMPLE_PATH);
      if (!res.ok) throw new Error("File contoh tidak ditemukan.");
      const pf = parsePajakBuffer(new Uint8Array(await res.arrayBuffer()), SAMPLE_NAME);
      await saveFile(pf);
    } catch (e) {
      const msg = "Gagal memuat contoh: " + (e instanceof Error ? e.message : String(e));
      setMsg(msg);
      toast.error(msg, { duration: Infinity });
    } finally {
      setLoadingSample(false);
    }
  };

  const rinciBySsp = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of file?.rinci ?? []) {
      const k = vt(r.No_SSP);
      const arr = m.get(k);
      if (arr) arr.push(r);
      else m.set(k, [r]);
    }
    return m;
  }, [file]);

  const sspMap = useMemo(() => {
    const m = new Map<string, Row>();
    for (const p of file?.pajak ?? []) m.set(vt(p.No_SSP), p);
    return m;
  }, [file]);

  const rows: BarisPajak[] = useMemo(() => {
    const out: BarisPajak[] = [];
    for (const p of file?.pajak ?? []) {
      const noSsp = vt(p.No_SSP);
      const bukti = (rinciBySsp.get(noSsp) ?? []).map((r) => vt(r.No_Bukti)).filter(Boolean).join(", ");
      out.push({
        key: `file:${noSsp}¦${vt(p.Kd_Rincian)}¦${Number(p.Jumlah) || 0}`,
        noSsp, tgl: vt(p.Tgl_SSP), keterangan: vt(p.Keterangan),
        jenis: jenisLabel(vt(p.Kd_Rincian), vt(p.Jenis_Setoran)),
        nilai: Number(p.Jumlah) || 0, ntpn: vt(p.NTPN),
        noBukti: bukti, manual: false,
      });
    }
    for (const m of manual) {
      const ssp = sspMap.get(m.noSpp);
      out.push({
        key: `manual:${m.id}`, noSsp: m.noSpp, tgl: ssp ? vt(ssp.Tgl_SSP) : "",
        keterangan: ssp ? vt(ssp.Keterangan) : "", jenis: jenisLabel(m.kdRincian, ""),
        nilai: m.nilai, ntpn: m.billing, noBukti: m.noBukti,
        manual: true, manualId: m.id,
      });
    }
    return out.sort((a, b) => a.noSsp.localeCompare(b.noSsp, "id", { numeric: true }));
  }, [file, manual, rinciBySsp, sspMap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((x) => {
      if (jenis && x.jenis !== jenis) return false;
      if (noSsp && x.noSsp !== noSsp) return false;
      if (triwulan && quarter(x.tgl) !== Number(triwulan)) return false;
      if (sumber === "file" && x.manual) return false;
      if (sumber === "manual" && !x.manual) return false;
      if (q && !`${x.noSsp} ${x.keterangan} ${x.jenis} ${x.ntpn} ${x.noBukti}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, jenis, noSsp, triwulan, sumber, search]);

  const totNilai = filtered.reduce((s, x) => s + x.nilai, 0);
  const jenisOpts = [...new Set(rows.map((x) => x.jenis).filter(Boolean))].sort();
  const sspOpts = [...new Set(rows.filter((x) => !x.manual).map((x) => x.noSsp))].sort();
  const ntpnOk = filtered.filter((x) => x.ntpn.trim()).length;

  const exportCsv = () => {
    const head = "No SSP,Tgl SSP,Keterangan,Jenis Pajak,Nilai,NTPN,No Bukti";
    const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((x) =>
      [x.noSsp, tgl(x.tgl), cell(x.keterangan), cell(x.jenis), x.nilai, x.ntpn, cell(x.noBukti)].join(","),
    );
    download("rekap_pajak.csv", "﻿" + [head, ...lines].join("\r\n"), "text/csv;charset=utf-8");
    toast.success("Berkas CSV terunduh.");
  };

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="mb-4">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Rekap pajak</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Setoran pajak (SSP) dari file pajak Siskeudes.</p>
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-3">
          <label className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
            {file ? "Ganti file pajak .SMD" : "Pilih file pajak .SMD"}
            <input type="file" accept=".smd,.SMD" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void processFile(f); e.target.value = ""; }} />
          </label>
          {!file && (
            <Button size="sm" variant="outline" disabled={loadingSample} onClick={loadSample}>
              {loadingSample ? "Memuat…" : `Muat ${SAMPLE_NAME}`}
            </Button>
          )}
          {file && <span className="text-xs text-muted-foreground">{file.name} · {file.pajak.length.toLocaleString("id-ID")} SSP · {file.rinci.length.toLocaleString("id-ID")} rincian</span>}
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </CardContent>
      </Card>

      {!file && (
        <p className="text-sm text-muted-foreground">
          Belum ada file pajak. Pilih file pajak .SMD dari Siskeudes (tabel Ta_Pajak + Ta_PajakRinci), atau pakai file contoh.
          Data mentah bisa ditelaah di menu <b>Data Pajak</b>.
        </p>
      )}

      {file && (
        <>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Kpi label="Total setor pajak" value={rp(totNilai)} sub={`${filtered.length} SSP`} />
            <Kpi label="Jenis pajak" value={String(jenisOpts.length)} sub={jenisOpts.join(", ") || "-"} />
            <Kpi label="NTPN terisi" value={`${ntpnOk}/${filtered.length}`} sub="NTPN (bukti setor)" />
            <Kpi label="Input manual" value={String(manual.length)} sub="Tambahan di luar file" />
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
                <Filter label="SSP">
                  <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={noSsp} onChange={(e) => setNoSsp(e.target.value)}>
                    <option value="">Semua SSP</option>
                    {sspOpts.map((s) => <option key={s} value={s}>{s}</option>)}
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
                  <Input className="h-9 w-full text-sm" placeholder="SSP / keterangan / NTPN…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
            <CardHeader className="p-3 pb-1"><CardTitle>Rekap pajak ({filtered.length})</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-3">
              <div className="overflow-x-auto rounded-none border-2">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">No SSP</th>
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Tanggal</th>
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Keterangan</th>
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Jenis pajak</th>
                    <th scope="col" className="num h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Nilai (Rp)</th>
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">NTPN</th>
                    <th scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">No bukti</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((x) => (
                    <tr key={x.key} className="hover:bg-primary/5">
                      <td className="h-11 border px-3 text-xs font-medium">
                        {x.noSsp}
                        {x.manual && (
                          <div>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-xs text-destructive" onClick={async () => {
                              if (!x.manualId || !(await confirm({ title: "Hapus data pajak manual ini?", tone: "destructive", confirmLabel: "Hapus" }))) return;
                              await idbDel("pajakManual", x.manualId);
                              await reload();
                              toast.success("Data pajak manual dihapus.");
                            }}>Hapus</Button>
                          </div>
                        )}
                      </td>
                      <td className="h-11 border px-3 text-xs">{tgl(x.tgl)}</td>
                      <td className="h-11 border px-3">{x.keterangan ? <CopyCell text={x.keterangan} /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="h-11 border px-3">{x.jenis}</td>
                      <td className="h-11 border px-3 num">{rp(x.nilai)}</td>
                      <td className="h-11 border px-3 font-mono text-xs">{x.ntpn ? <CopyCell text={x.ntpn} /> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="h-11 border px-3 text-xs">{x.noBukti || <span className="text-muted-foreground">—</span>}</td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={7} className="border px-3 py-3 text-center text-sm text-muted-foreground">Tidak ada data.</td></tr>}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>

          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Tambah data pajak</DialogTitle></DialogHeader>
              <PajakForm
                sspOpts={sspOpts}
                rinciList={file.rinci}
                jenisOpts={jenisOpts}
                fileName={file.name}
                onSaved={async () => { setFormOpen(false); await reload(); toast.success("Data pajak manual disimpan."); }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
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

/** Teks sel yang langsung tersalin ke clipboard saat diklik (dengan umpan balik). */
function CopyCell({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  const salin = async () => {
    if (!text || copied) return;
    if (!(await copyText(text))) return;
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      title={copied ? "Tersalin!" : "Klik untuk menyalin"}
      aria-label={copied ? "Tersalin" : `Salin: ${text}`}
      onClick={salin}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void salin(); } }}
      className={`cursor-pointer rounded-sm px-0.5 underline decoration-dotted underline-offset-2 hover:bg-accent ${copied ? "bg-success-soft text-success" : ""}`}
    >
      {copied ? "Tersalin!" : text}
    </span>
  );
}

function PajakForm({
  sspOpts, rinciList, jenisOpts, fileName, onSaved,
}: {
  sspOpts: string[];
  rinciList: Row[];
  jenisOpts: string[];
  fileName: string;
  onSaved: () => Promise<void>;
}) {
  const [noSsp, setNoSsp] = useState("");
  const [noBukti, setNoBukti] = useState("");
  const [kdRincian, setKdRincian] = useState(jenisOpts[0] ?? "");
  const [kdCustom, setKdCustom] = useState(false);
  const [nilai, setNilai] = useState(0);
  const [ntpn, setNtpn] = useState("");
  const [err, setErr] = useState("");

  const buktiOpts = rinciList.filter((r) => !noSsp || vt(r.No_SSP) === noSsp);

  const simpan = async () => {
    if (!noSsp) { setErr("Pilih SSP."); return; }
    const kode = kdRincian.trim();
    if (!kode) { setErr("Isi jenis pajak."); return; }
    if (kode.length > 50) { setErr("Jenis pajak maksimal 50 karakter."); return; }
    if (ntpn.length > 50) { setErr("NTPN maksimal 50 karakter."); return; }
    if (!(nilai > 0)) { setErr("Nilai harus lebih dari 0."); return; }
    await idbPut("pajakManual", {
      id: newId("pj"), scope: fileName, fileName, noSpp: noSsp, noBukti: noBukti.trim(), kdKeg: "", kdRincian: kode,
      nilai: Math.round(nilai * 100) / 100, billing: ntpn.trim(), ts: Date.now(),
    });
    await onSaved();
  };

  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-xs font-medium">SSP
        <ComboboxField
          items={sspOpts.map((s) => ({ value: s, label: s }))}
          value={noSsp}
          onChange={(v) => { setNoSsp(v); setNoBukti(""); }}
          placeholder="Cari & pilih SSP…"
          className="h-9"
        />
      </label>
      <label className="block space-y-1 text-xs font-medium">No bukti / kwitansi (opsional)
        <ComboboxField
          items={buktiOpts.map((r) => ({ value: vt(r.No_Bukti), label: vt(r.No_Bukti) }))}
          value={noBukti}
          onChange={setNoBukti}
          placeholder={noSsp ? "Pilih bukti…" : "Pilih SSP dulu…"}
          disabled={!noSsp}
          className="h-9"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1 text-xs font-medium">Jenis pajak
          {kdCustom ? (
            <Input className="h-9 text-sm" placeholder="cth: Pajak Daerah" value={kdRincian} onChange={(e) => setKdRincian(e.target.value)} />
          ) : (
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={kdRincian} onChange={(e) => (e.target.value === "__baru__" ? (setKdCustom(true), setKdRincian("")) : setKdRincian(e.target.value))}>
              {jenisOpts.map((j) => <option key={j} value={j}>{j}</option>)}
              <option value="__baru__">Jenis lain…</option>
            </select>
          )}
        </label>
        <label className="block space-y-1 text-xs font-medium">Nilai (Rp)
          <MoneyInput className="h-9" value={nilai} onChange={setNilai} />
        </label>
      </div>
      <label className="block space-y-1 text-xs font-medium">NTPN (opsional)
        <Input className="h-9 text-sm" value={ntpn} onChange={(e) => setNtpn(e.target.value)} placeholder="cth: 44BE53IS5MGU79JK" />
      </label>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button size="sm" onClick={simpan}>Simpan</Button>
    </div>
  );
}
