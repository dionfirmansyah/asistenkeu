import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useSmdStore } from "@/stores/smd-store";
import { idbAll, idbPut, idbDel, newId, peekCache, rememberCache, type DocStatus, type RpdDoc, type RpdEntry } from "@/lib/storage/idb";
import { nfInt0, nf0, rp } from "@/lib/engine/format";
import { download } from "@/lib/csv";
import { buildRpdExcelDoc } from "./excel";
import { buildRpdJson, parseRpdJson } from "./jsonFile";
import { Button } from "@/components/ui/button";
import { DanaBadge } from "@/components/ui/dana-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ComboboxField } from "@/components/ui/combobox";
import { useConfirm } from "@/hooks/use-confirm";
import { buildRpdPrintDoc, rekName } from "./print";
import { ArrowLeft, ChevronDown, Eraser, FileDown, FileSpreadsheet, FileUp, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { RabFlatRow, SmdTables } from "@/types/smd";
import { villageIdentity } from "@/lib/engine/identity";

const BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const nat = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });

interface RpdItem {
  key: string;
  kegKd: string;
  rincId: string;
  r: RabFlatRow;
  price: number;
  vol: number;
  amt: number;
}

const scopeOf = (flat: RabFlatRow[]) => (flat[0] ? `${flat[0].Kd_Desa}-${flat[0].Tahun}` : "default");

const docStatus = (d: RpdDoc): DocStatus => d.status ?? "draft";

const STATUS_COLS: Array<{ id: DocStatus; label: string; tone: StatusTone }> = [
  { id: "draft", label: "Draf", tone: "warning" },
  { id: "progress", label: "Berjalan", tone: "info" },
  { id: "done", label: "Selesai", tone: "success" },
];

export default function RpdView() {
  const { flat, fileName, tables } = useSmdStore();
  const scope = scopeOf(flat);
  const [keg, setKeg] = useState("");
  const [rinc, setRinc] = useState("");
  const [search, setSearch] = useState("");
  const [vols, setVols] = useState<Record<string, string>>({});
  const [amts, setAmts] = useState<Record<string, string>>({});
  const amtOf = (it: { key: string; price: number }) =>
    amts[it.key] !== undefined && amts[it.key] !== "" ? Number(amts[it.key].replace(/\./g, "").replace(",", ".")) || 0 : Math.round((Number(vols[it.key]) || 0) * it.price);
  const [bulan, setBulan] = useState("");
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const { confirmNode, confirm, notify } = useConfirm();
  const [ioMsg, setIoMsg] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  // URL: #/rpd/<id> → halaman detail; tanpa id → daftar RPD
  const [docId, setDocId] = useState(() => {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    return parts[0] === "rpd" && parts[1] ? parts[1] : "";
  });
  useEffect(() => {
    const onHash = () => {
      const parts = window.location.hash.replace(/^#\/?/, "").split("/");
      setDocId(parts[0] === "rpd" && parts[1] ? parts[1] : "");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Cat awal dari cache memori (anti-kedip); effect di bawah tetap baca segar.
  const [docs, setDocs] = useState<RpdDoc[]>(() => peekCache<RpdDoc[]>(`docs:${scope}`) ?? []);
  const [entries, setEntries] = useState<RpdEntry[]>(() => {
    const all = peekCache<RpdEntry[]>(`entries:${scope}`) ?? [];
    return all.filter((e) => (docId ? e.docId === docId : false));
  });

  // Indeks item belanja (sesudah PAK)
  const { items, kegs, rincByKeg } = useMemo(() => {
    const items = new Map<string, RpdItem>();
    const kegs = new Map<string, string>();
    const rincByKeg = new Map<string, Map<string, string>>();
    for (const r of flat) {
      if (r.Pseudo || r.Jenis !== "BELANJA" || !r.AnggaranStlhPAK) continue;
      const it: RpdItem = {
        key: [r.Kd_Keg, r.Kd_Rincian, r.Kd_SubRinci, r.No_Urut].join("|"),
        kegKd: r.Kd_Keg, rincId: r.Kd_SubRinci, r,
        price: r.HrgSatuanPAK, vol: r.JmlSatuanPAK, amt: r.AnggaranStlhPAK,
      };
      items.set(it.key, it);
      if (!kegs.has(r.Kd_Keg)) kegs.set(r.Kd_Keg, r.ID_Keg ? `${r.ID_Keg} — ${r.Nama_Kegiatan}` : r.Nama_Kegiatan);
      let m = rincByKeg.get(r.Kd_Keg);
      if (!m) rincByKeg.set(r.Kd_Keg, (m = new Map()));
      if (!m.has(r.Kd_SubRinci)) m.set(r.Kd_SubRinci, r.Nama_Rincian || "(tanpa nama rincian)");
    }
    return { items, kegs, rincByKeg };
  }, [flat]);

  const kegOptions = useMemo(() => [...kegs.entries()].sort((a, b) => nat(a[0], b[0])), [kegs]);
  const rincOptions = useMemo(() => [...(rincByKeg.get(keg)?.entries() ?? [])].sort((a, b) => nat(a[0], b[0])), [rincByKeg, keg]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...items.values()]
      .filter((it) => it.kegKd === keg && it.rincId === rinc)
      .sort((a, b) => nat(a.r.No_Urut || "", b.r.No_Urut || ""))
      .filter((it) => !q || [it.r.Uraian, it.r.Kd_Rincian, it.r.Nama_Rincian, it.r.SumberDana, it.r.Satuan].map(String).join(" ").toLowerCase().includes(q));
  }, [items, keg, rinc, search]);

  const reload = async () => {
    const ds = (await idbAll<RpdDoc>("docs", scope)).sort((a, b) => (b.updated || b.ts || 0) - (a.updated || a.ts || 0));
    rememberCache(`docs:${scope}`, ds);
    setDocs(ds);
    const ents = await idbAll<RpdEntry>("entries", scope);
    rememberCache(`entries:${scope}`, ents);
    setEntries(ents.filter((e) => (docId ? e.docId === docId : false)));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, [scope, docId]);

  const moveDoc = async (id: string, status: DocStatus) => {
    const cur = docs.find((x) => x.id === id);
    if (!cur || docStatus(cur) === status) return;
    const next = { ...cur, status, updated: Date.now() };
    await idbPut("docs", next);
    const ds = docs.map((x) => (x.id === id ? next : x));
    rememberCache(`docs:${scope}`, ds);
    setDocs(ds);
    const label = STATUS_COLS.find((c) => c.id === status)?.label ?? status;
    const msg = `RPD "${cur.name || cur.judul || "RPD"}" dipindahkan ke ${label}.`;
    if (status === "done") toast.success(msg);
    else if (status === "progress") toast.info(msg);
    else toast.info(msg);
  };

  const doc = docs.find((d) => d.id === docId) ?? null;
  const usedOf = (key: string) =>
    entries.filter((e) => e.key === key).reduce((a, x) => ({ vol: a.vol + x.vol, amt: a.amt + x.amt }), { vol: 0, amt: 0 });

  const addAll = async () => {
    if (!docId) { await notify({ title: "Belum ada RPD aktif", description: "Buat atau pilih RPD terlebih dahulu." }); return; }
    let added = 0;
    const errors: string[] = [];
    for (const it of visible) {
      const vol = Number(vols[it.key]) || 0;
      if (vol <= 0) continue;
      const used = usedOf(it.key);
      if (used.vol + vol > it.vol + 1e-9) {
        errors.push(`${it.r.Uraian}: melebihi sisa volume (${nfInt0(Math.max(0, it.vol - used.vol))} ${it.r.Satuan || "unit"})`);
        continue;
      }
      const amt = Math.round(amtOf(it));
      if (used.amt + amt > it.amt + 1) {
        errors.push(`${it.r.Uraian}: melebihi sisa anggaran (${rp(Math.max(0, it.amt - used.amt))})`);
        continue;
      }
      const raw = bulan;
      const bln = raw === "" || raw === "_none" ? null : Number(raw);
      await idbPut("entries", { id: newId("p"), scope, docId, key: it.key, bln, vol, amt, ts: Date.now() });
      added++;
    }
    if (!added && !errors.length) { await notify({ title: "Belum ada volume", description: "Isi volume pada minimal satu item belanja terlebih dahulu." }); }
        else if (errors.length) { await notify({ title: `${added} item ditambahkan`, description: `Sebagian item tidak ditambahkan:\n${errors.join("\n")}` }); }
    else toast.success(`${added} item rencana ditambahkan.`);
    setVols({});
    setAmts({});
    await reload();
  };

  const rows = useMemo(
    () => entries.slice().sort((a, b) => (a.bln ?? 99) - (b.bln ?? 99) || nat(a.key, b.key)),
    [entries],
  );
  const totA = rows.reduce((s, x) => s + x.amt, 0);
  const pm = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const x of entries) if (x.bln !== null) arr[x.bln] += x.amt;
    return arr;
  }, [entries]);
  const tanpaBulan = entries.filter((x) => x.bln === null).reduce((s, x) => s + x.amt, 0);
  const tp = pm.reduce((a, b) => a + b, 0) + tanpaBulan;
  const dana = useMemo(() => {
    const m = new Map<string, { sd: string; n: number; amt: number }>();
    for (const x of rows) {
      const it = items.get(x.key);
      if (!it) continue;
      const sd = it.r.SumberDana || "(tanpa sumber dana)";
      const rec = m.get(sd) ?? { sd, n: 0, amt: 0 };
      rec.n++; rec.amt += x.amt; m.set(sd, rec);
    }
    return [...m.values()].sort((a, b) => b.amt - a.amt);
  }, [rows, items]);

  const kosongkan = async () => {
    if (!entries.length || !(await confirm({ title: `Hapus semua rencana pada ${doc?.name || "RPD aktif"}?`, description: "Seluruh baris rencana ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return;
    for (const e of entries) await idbDel("entries", e.id);
    await reload();
    toast.success("Semua rencana dihapus.");
  };

  const hapusDokumen = async () => {
    if (!doc || !(await confirm({ title: `Hapus RPD "${doc.name}"?`, description: "Seluruh rencananya ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return;
    for (const e of entries) await idbDel("entries", e.id);
    await idbDel("docs", doc.id);
    window.location.hash = "/rpd";
    await reload();
    toast.success(`Dokumen RPD "${doc.name}" dihapus.`);
  };

  const exportJson = () => {
    if (!doc) return;
    const base = (fileName ?? "rpd").replace(/\.[^.]+$/, "");
    const suffix = (doc.name || "rencana_penggunaan").toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    download(`${base}_${suffix || "rencana_penggunaan"}.rpd.json`, buildRpdJson(doc, rows, fileName ?? ""), "application/json");
    setIoMsg(`Diekspor ${rows.length} baris rencana.`);
    toast.success(`Berkas JSON diekspor — ${rows.length} baris rencana.`);
  };

  const exportExcel = () => {
    if (!doc) return;
    const base = (fileName ?? "rpd").replace(/\.[^.]+$/, "");
    const suffix = (doc.name || "rencana_penggunaan").toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    download(
      `${base}_${suffix || "rencana_penggunaan"}.xls`,
      buildRpdExcelDoc(doc, { entries: rows, kegs, items }),
      "application/vnd.ms-excel;charset=utf-8",
    );
    setIoMsg(`Diekspor ke Excel (${rows.length} baris rencana).`);
    toast.success(`Berkas Excel diekspor — ${rows.length} baris rencana.`);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = parseRpdJson(await file.text());
      if (parsed.doc.scope !== scope) {
        if (!(await confirm({ title: "Impor ke scope berbeda?", description: `File ini untuk scope ${parsed.doc.scope}, sedangkan file aktif berscope ${scope}.`, confirmLabel: "Tetap impor" }))) return;
      }
      await idbPut("docs", { ...parsed.doc, scope, updated: Date.now() });
      const lama = await idbAll<RpdEntry>("entries", scope);
      for (const e of lama.filter((x) => x.docId === parsed.doc.id)) await idbDel("entries", e.id);
      for (const e of parsed.entries) {
        await idbPut("entries", { ...e, scope, docId: parsed.doc.id });
      }
      setIoMsg(`Diimpor ${parsed.entries.length} baris rencana ke "${parsed.doc.name}".`);
      toast.success(`Diimpor ${parsed.entries.length} baris rencana ke "${parsed.doc.name}".`);
      if (parsed.doc.id !== docId) window.location.hash = `/rpd/${parsed.doc.id}`;
      else await reload();
    } catch (e) {
      const msg = "Gagal impor: " + (e instanceof Error ? e.message : String(e));
      setIoMsg(msg);
      toast.error(msg, { duration: Infinity });
    }
  };

  if (!docId) {
    // ---- Daftar RPD ----
    return (
      <div className="space-y-4">
      {confirmNode}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Rencana penggunaan</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Dokumen rencana penggunaan dana per kegiatan.</p>
          </div>
          <Button size="sm" onClick={() => setModal("new")}>RPD baru</Button>
        </div>
        {!docs.length && (
          <p className="text-sm text-muted-foreground">Belum ada RPD. Klik <b>RPD Baru</b> untuk membuat dokumen rencana penggunaan dana.</p>
        )}
        <div className="grid items-start gap-3 md:grid-cols-3">
          {STATUS_COLS.map((col) => {
            const colDocs = docs.filter((d) => docStatus(d) === col.id);
            return (
              <div
                key={col.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) void moveDoc(id, col.id);
                }}
                className="flex min-h-[calc(100svh-var(--header-h)-7rem)] flex-col gap-2 rounded-none border-2 bg-muted/40 p-2"
              >
                <div className="flex items-center gap-2 px-1 pt-1">
                  <StatusBadge tone={col.tone}>{col.label}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{colDocs.length}</span>
                </div>
                {colDocs.map((d) => (
                  <div
                    key={d.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", d.id); e.dataTransfer.effectAllowed = "move"; }}
                    className="rounded-none border-2 bg-card p-3 transition hover:border-primary/30"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => { window.location.hash = `/rpd/${d.id}`; }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate font-semibold">{d.name || d.judul || "RPD"}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          Desa {d.desa || "-"} · Kecamatan {d.kecamatan || "-"} · Tahun {d.tahun || "-"}
                        </div>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        title="Hapus RPD"
                        aria-label="Hapus RPD"
                        onClick={async () => {
                          if (!(await confirm({ title: `Hapus RPD "${d.name}"?`, description: "Seluruh rencananya ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return;
                          const ents = await idbAll<RpdEntry>("entries", scope);
                          for (const en of ents.filter((x) => x.docId === d.id)) await idbDel("entries", en.id);
                          await idbDel("docs", d.id);
                          await reload();
                          toast.success(`Dokumen RPD "${d.name}" dihapus.`);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="mt-2">
                      <StatusBadge tone={col.tone}>{col.label}</StatusBadge>
                    </div>
                  </div>
                ))}
                {!colDocs.length && (
                  <p className="rounded-none border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
                    Belum ada — seret kartu ke sini
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <RpdDocDialog modal={modal} setModal={setModal} doc={null} scope={scope} flat={flat} tables={tables} onSaved={(d) => { setModal(null); window.location.hash = `/rpd/${d.id}`; void reload(); toast.success(`Dokumen RPD "${d.name}" disimpan.`); }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {confirmNode}
      {/* Doc bar */}
      <Card>
        <CardContent className="space-y-2 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { window.location.hash = "/rpd"; }}><ArrowLeft className="size-3.5" /> Daftar RPD</Button>
            <b>{doc?.name || "RPD"}</b>
            {doc && (
              <StatusBadge tone={STATUS_COLS.find((c) => c.id === docStatus(doc))?.tone ?? "warning"}>
                {STATUS_COLS.find((c) => c.id === docStatus(doc))?.label ?? "Draf"}
              </StatusBadge>
            )}
            <select
              className="h-8 rounded-md border border-input bg-card px-1 text-xs"
              value={doc ? docStatus(doc) : "draft"}
              aria-label="Ubah status"
              disabled={!doc}
              onChange={(e) => { if (doc) void moveDoc(doc.id, e.target.value as DocStatus); }}
            >
              {STATUS_COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">
              {doc ? `Desa ${doc.desa || "-"}, Kecamatan ${doc.kecamatan || "-"}, Tahun ${doc.tahun || "-"}.` : ""}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Dokumen</span>
            <Button size="sm" variant="outline" onClick={() => setModal("new")}><Plus className="size-3.5" /> Baru</Button>
            <Button size="sm" variant="outline" onClick={() => setModal("edit")} disabled={!doc}><Pencil className="size-3.5" /> Edit</Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button size="sm" variant="outline" aria-label="Aksi berbahaya" title="Aksi berbahaya" />}
              >
                Lainnya
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem disabled={!entries.length} onClick={() => void kosongkan()}>
                  <Eraser />
                  Kosongkan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={!doc} onClick={() => void hapusDokumen()}>
                  <Trash2 />
                  Hapus RPD
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Ekspor / Impor</span>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-primary bg-transparent px-2.5 text-[0.8rem] font-medium text-primary hover:bg-primary/5">
              <FileUp className="size-3.5" /> Impor JSON
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = ""; }}
              />
            </label>
            <Button size="sm" variant="outline" onClick={exportJson}><FileDown className="size-3.5" /> Ekspor JSON</Button>
            <Button size="sm" variant="outline" onClick={exportExcel}><FileSpreadsheet className="size-3.5" /> Ekspor Excel</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              if (!doc) return;
              const win = window.open("", "_blank");
              if (!win) { await notify({ title: "Popup diblokir", description: "Izinkan popup untuk situs ini agar dokumen bisa dicetak." }); return; }
              win.document.write(buildRpdPrintDoc(doc, { entries, ridx: { keg: new Map([...kegs.entries()].map(([kd, name]) => [kd, { name }])), items } }));
              win.document.close();
            }}><Printer className="size-3.5" /> Cetak</Button>
            {ioMsg && <span className="text-xs text-muted-foreground">{ioMsg}</span>}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label="Total rencana" value={rp(tp)} sub={`${entries.length} baris rencana`} />
        {dana.slice(0, 3).map((d) => (
          <Kpi key={d.sd} label={d.sd} value={rp(d.amt)} sub={`${d.n} baris · ${totA ? Math.round((d.amt / totA) * 100) : 0}% dari rencana`} />
        ))}
      </div>

      {/* Tambah rencana */}
      <Card className="overflow-hidden border-primary/20">
        <div className="border-b bg-muted/40 px-4 pb-3 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Tambah rencana</CardTitle>
              <p className="text-xs text-muted-foreground">Pilih kegiatan → isi volume → tambahkan. Anggaran terhitung otomatis.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Bulan</span>
              <Select value={bulan} onValueChange={(v) => setBulan(v === "_none" ? "" : v ?? "")}>
                <SelectTrigger className="h-9 w-40 border-primary/30 bg-card"><SelectValue placeholder="Belum ditentukan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Belum ditentukan</SelectItem>
                  {BLN.map((b, i) => <SelectItem key={i} value={String(i)}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Langkah 1-2-3 */}
          <div className="mt-3 flex items-center gap-2 text-xs font-medium">
            <StepDot n={1} aktif done={!!keg} label="Kegiatan" />
            <div className={`h-px flex-1 ${keg ? "bg-primary" : "bg-border"}`} />
            <StepDot n={2} aktif={!!keg} done={!!rinc} label="Rincian" />
            <div className={`h-px flex-1 ${rinc ? "bg-primary" : "bg-border"}`} />
            <StepDot n={3} aktif={!!rinc} done={Object.values(vols).some((v) => Number(v) > 0)} label="Volume" />
          </div>
          <div className="mt-3 grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="block space-y-1 text-xs font-medium">
              <span>Kegiatan</span>
              <ComboboxField
                items={kegOptions.map(([v, label]) => ({ value: v, label }))}
                value={keg}
                onChange={(v) => { setKeg(v); setRinc(""); }}
                placeholder="Cari & pilih kegiatan…"
              />
            </label>
            <label className="block space-y-1 text-xs font-medium">
              <span>Rincian kegiatan</span>
              <ComboboxField
                items={rincOptions.map(([id, name]) => ({ value: id, label: `${id}. ${name}` }))}
                value={rinc}
                onChange={(v) => setRinc(v)}
                placeholder={keg ? "Cari & pilih rincian…" : "Pilih kegiatan dulu…"}
                disabled={!keg}
              />
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground">⌕</span>
              <Input className="h-9 w-full pl-8 md:w-56" placeholder="Cari item…" value={search} onChange={(e) => setSearch(e.target.value)} disabled={!keg || !rinc} />
            </div>
          </div>
        </div>
        <CardContent className="space-y-2 p-3">
          {!keg && (
            <button type="button" onClick={() => document.querySelector<HTMLElement>("[data-keg-combo]")?.click()} className="w-full rounded-none border-2 border-dashed p-6 text-center text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5">
              <div className="text-2xl">🧭</div>
              <div className="mt-1 font-medium">Mulai dengan memilih kegiatan di atas</div>
              <div className="text-xs">Gunakan kolom pencarian untuk menemukan kegiatan dengan cepat</div>
            </button>
          )}
          {keg && !rinc && <p className="rounded-none border-2 border-dashed p-4 text-center text-sm text-muted-foreground">Pilih rincian kegiatan untuk melihat item belanja.</p>}
          {visible.map((it) => {
            const used = usedOf(it.key);
            const sisaVol = Math.max(0, it.vol - used.vol);
            const sisaAmt = Math.max(0, it.amt - used.amt);
            const vol = Number(vols[it.key]) || 0;
            const terisi = vol > 0;
            const over = vol > sisaVol + 1e-9;
            const amtKini = amtOf(it);
            const overAmt = terisi && amtKini > sisaAmt + 1;
            return (
              <div key={it.key} className={`rounded-none border-2 p-3 text-sm transition ${terisi ? "border-primary/60 bg-primary/5" : "hover:border-primary/30"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.r.Uraian}</div>
                    <div className="truncate text-xs text-muted-foreground">{it.kegKd} · {it.r.Kd_Rincian || ""}</div>
                  </div>
                  <DanaBadge value={it.r.SumberDana} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <StatChip label="Harga" value={rp(it.price)} />
                  <StatChip label="Vol RAB" value={`${nfInt0(it.vol)} ${it.r.Satuan || ""}`} />
                  <StatChip label="Sisa vol" value={`${nfInt0(sisaVol)}`} tone={sisaVol <= 0 ? "habis" : undefined} />
                  <StatChip label="Sisa Rp" value={rp(sisaAmt)} tone={sisaAmt <= 0 ? "habis" : undefined} />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-none bg-muted/50 p-2">
                  <label className="flex items-center gap-2 text-xs font-medium">Volume
                    <Input className={`h-9 w-28 text-right font-semibold ${over ? "border-destructive" : ""}`} type="number" min={0} step="any" placeholder="0" value={vols[it.key] ?? ""} onChange={(e) => setVols({ ...vols, [it.key]: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium">Jumlah (Rp)
                    <Input className={`h-9 w-36 text-right font-semibold ${overAmt ? "border-destructive" : ""}`} inputMode="decimal" placeholder={rp(vol * it.price)} value={amts[it.key] ?? ""} onChange={(e) => setAmts({ ...amts, [it.key]: e.target.value })} />
                  </label>
                  <span className="text-xs text-muted-foreground">otomatis ≈ {rp(vol * it.price)}</span>
                  {terisi && !over && !overAmt && <span className="text-xs text-success">✓ siap ditambahkan</span>}
                  {over && <span className="text-xs font-medium text-destructive">⚠ melebihi sisa {nfInt0(sisaVol)}</span>}
                  {overAmt && <span className="text-xs font-medium text-destructive">⚠ melebihi sisa {rp(sisaAmt)}</span>}
                </div>
              </div>
            );
          })}
          {keg && rinc && !visible.length && <p className="text-sm text-muted-foreground">Tidak ada item yang cocok.</p>}
          {(() => {
            const adaLebih = visible.some((it) => {
              const v = Number(vols[it.key]) || 0;
              if (v <= 0) return false;
              const used = usedOf(it.key);
              return v > Math.max(0, it.vol - used.vol) + 1e-9 || amtOf(it) > Math.max(0, it.amt - used.amt) + 1;
            });
            const n = visible.filter((it) => (Number(vols[it.key]) || 0) > 0).length;
            const tot = visible.reduce((s, it) => s + ((Number(vols[it.key]) || 0) > 0 ? amtOf(it) : 0), 0);
            return (
              <div className="sticky bottom-2 flex items-center justify-between gap-2 rounded-none border-2 bg-card p-2.5 shadow-lg">
                <span className="text-xs text-muted-foreground">
                  {n ? `${n} item · ${rp(tot)}${bulan === "" ? " · tanpa bulan" : ` · ${BLN[Number(bulan)]}`}` : "Belum ada volume diisi"}
                  {adaLebih && " · ada yang melebihi sisa"}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {keg && (
                    <Button
                      variant="outline"
                      onClick={() => { setKeg(""); setRinc(""); setVols({}); setAmts({}); setSearch(""); }}
                    >
                      Batal
                    </Button>
                  )}
                  <Button onClick={addAll} disabled={!docId || !keg || !rinc || adaLebih}>Tambahkan ke rencana</Button>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Daftar rencana — tata letak seperti cetak, ramah dark mode */}
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Daftar kegiatan RPD — {rows.length} baris</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          {rows.length ? (
            <RpdPlanTable rows={rows} items={items} kegs={kegs} onChanged={reload} />
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada rencana. Ikuti langkah di atas untuk menambahkan rencana penggunaan.</p>
          )}
        </CardContent>
      </Card>

      {/* Ringkasan */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle>Per bulan</CardTitle></CardHeader>
          <CardContent className="h-72 p-3">
            <ChartContainer config={{ rencana: { label: "Rencana", color: "var(--color-primary)" }, kumulatif: { label: "Kumulatif", color: "var(--color-accent-foreground)" } }}>
              <ComposedChart data={BLN.map((b, i) => ({ b, rencana: pm[i], kumulatif: pm.slice(0, i + 1).reduce((a, c) => a + c, 0) }))}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="b" />
                <YAxis tickFormatter={(n) => nf0(Number(n))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => rp(Number(v))} />} />
                <Bar dataKey="rencana" fill="var(--color-primary)" radius={4} />
                <Line type="monotone" dataKey="kumulatif" stroke="var(--color-accent-foreground)" />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 pb-1"><CardTitle>Sumber dana pada RPD aktif</CardTitle></CardHeader>
          <CardContent className="p-3 overflow-x-auto">
            <div className="overflow-x-auto rounded-none border-2">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted text-left"><th scope="col" className="h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Sumber dana</th><th scope="col" className="num h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Baris RPD</th><th scope="col" className="num h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Nominal RPD</th><th scope="col" className="num h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">%</th></tr></thead>
              <tbody>
                {dana.map((d) => (
                  <tr key={d.sd} className="border-t hover:bg-primary/5">
                    <td className="h-11 px-3">{d.sd}</td>
                    <td className="num h-11 px-3">{d.n.toLocaleString("id-ID")}</td>
                    <td className="num h-11 px-3">{rp(d.amt)}</td>
                    <td className="num h-11 px-3">{totA ? Math.round((d.amt / totA) * 100) : 0}%</td>
                  </tr>
                ))}
                {!dana.length && <tr><td colSpan={4} className="py-2 text-sm text-muted-foreground">Belum ada sumber dana yang masuk ke RPD aktif.</td></tr>}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal dokumen */}
      <RpdDocDialog modal={modal} setModal={setModal} doc={doc} scope={scope} flat={flat} tables={tables} onSaved={(d) => { setModal(null); if (modal === "new") window.location.hash = `/rpd/${d.id}`; void reload(); toast.success(`Dokumen RPD "${d.name}" disimpan.`); }} />
    </div>
  );
}

function RpdDocDialog({
  modal, setModal, doc, scope, flat, tables, onSaved,
}: {
  modal: "new" | "edit" | null;
  setModal: (v: "new" | "edit" | null) => void;
  doc: RpdDoc | null;
  scope: string;
  flat: RabFlatRow[];
  tables: SmdTables | null;
  onSaved: (d: RpdDoc) => void;
}) {
  return (
    <Dialog open={modal !== null} onOpenChange={(o) => !o && setModal(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{modal === "edit" ? "Edit RPD" : "RPD baru"}</DialogTitle></DialogHeader>
        {modal && (
          <RpdDocForm
            initial={modal === "edit" && doc ? doc : blankDoc(scope, flat, tables)}
            onSave={async (d) => {
              await idbPut("docs", d);
              onSaved(d);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RpdPlanTable({
  rows, items, kegs, onChanged,
}: {
  rows: RpdEntry[];
  items: Map<string, RpdItem>;
  kegs: Map<string, string>;
  onChanged: () => Promise<void>;
}) {
  const [editId, setEditId] = useState<string | null>(null);
  const [editVol, setEditVol] = useState("");
  const [editBln, setEditBln] = useState("");
  const [editAmt, setEditAmt] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const { confirmNode, notify } = useConfirm();

  const filteredRows = planSearch.trim()
    ? rows.filter((x) => {
        const it = items.get(x.key);
        const hay = [it?.r.Uraian, it?.r.Nama_Kegiatan, it?.r.Nama_Rincian, it?.r.SumberDana, it?.r.Kd_Rincian, kegs.get(it?.kegKd ?? "") ?? ""].join(" ").toLowerCase();
        return hay.includes(planSearch.trim().toLowerCase());
      })
    : rows;
  const filteredTot = filteredRows.reduce((s, x) => s + x.amt, 0);

  // Kelompokkan: kegiatan → rincian → jenis
  const byKeg = new Map<string, Map<string, RpdEntry[]>>();
  for (const x of filteredRows) {
    const it = items.get(x.key);
    if (!it) continue;
    let m = byKeg.get(it.kegKd);
    if (!m) byKeg.set(it.kegKd, (m = new Map()));
    const arr = m.get(it.rincId) ?? [];
    arr.push(x);
    m.set(it.rincId, arr);
  }

  let no = 1;
  const kegKeys = [...byKeg.keys()].sort((a, b) => a.localeCompare(b, "id", { numeric: true }));

  return (
    <div className="space-y-2">
      {confirmNode}
      <Input
        className="h-8 w-72 text-xs"
        placeholder="Cari kegiatan / uraian / sumber dana…"
        value={planSearch}
        onChange={(e) => setPlanSearch(e.target.value)}
      />
      <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted">
          <th rowSpan={2} scope="col" className="h-10 border px-3 text-center font-mono text-xs font-medium uppercase tracking-[0.06em]">No</th>
          <th rowSpan={2} scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Kode</th>
          <th rowSpan={2} scope="col" className="h-10 border px-3 text-left font-mono text-xs font-medium uppercase tracking-[0.06em]">Uraian</th>
          <th colSpan={4} scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Rencana</th>
          <th rowSpan={2} scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Aksi</th>
        </tr>
        <tr className="bg-muted">
          <th scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Sumber dana</th>
          <th scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Volume</th>
          <th scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Harga satuan (Rp)</th>
          <th scope="col" className="h-10 border px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Jumlah (Rp)</th>
        </tr>
      </thead>
      <tbody>
        {kegKeys.map((kd) => {
          const rincMap = byKeg.get(kd)!;
          const firstIt = items.get([...rincMap.values()][0]?.[0]?.key ?? "");
          const kegTotal = [...rincMap.values()].flat().reduce((s, x) => s + x.amt, 0);
          const kegName = firstIt ? firstIt.r.Nama_Kegiatan : kegs.get(kd) ?? kd;
          const kegCode = firstIt?.r.ID_Keg || kd;
          return (
            <Fragment key={kd}>
              <tr className="font-bold">
                <td className="border px-2 py-1"></td>
                <td className="border px-2 py-1">{kegCode.replace(/\.+$/, "")}</td>
                <td colSpan={4} className="border px-2 py-1">{kegName}</td>
                <td className="border px-2 py-1 num">{nf0(kegTotal)}</td>
                <td className="border px-2 py-1"></td>
              </tr>
              {[...rincMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true })).map(([rid, list]) => {
                const rincTotal = list.reduce((s, x) => s + x.amt, 0);
                const rincName = items.get(list[0].key)?.r.Nama_Rincian || "(tanpa nama rincian)";
                const byJenis = new Map<string, RpdEntry[]>();
                for (const e of list) {
                  const jk = items.get(e.key)?.r.Kd_Rincian || "-";
                  (byJenis.get(jk) ?? byJenis.set(jk, []).get(jk)!).push(e);
                }
                return (
                  <Fragment key={rid}>
                    <tr className="font-bold">
                      <td className="border px-2 py-1"></td>
                      <td className="border px-2 py-1 text-right">{rid}</td>
                      <td colSpan={4} className="border px-2 py-1 pl-4">{rincName}</td>
                      <td className="border px-2 py-1 num">{nf0(rincTotal)}</td>
                      <td className="border px-2 py-1"></td>
                    </tr>
                    {[...byJenis.entries()].sort((a, b) => a[0].localeCompare(b[0], "id", { numeric: true })).map(([jk, jlist]) => {
                      const jTotal = jlist.reduce((s, x) => s + x.amt, 0);
                      return (
                        <Fragment key={jk}>
                          {byJenis.size > 1 && (
                            <tr className="italic">
                              <td className="border px-2 py-1"></td>
                              <td className="border px-2 py-1 pl-4 text-right">{jk}</td>
                              <td colSpan={4} className="border px-2 py-1 pl-4">{rekName(jk)}</td>
                              <td className="border px-2 py-1 num">{nf0(jTotal)}</td>
                              <td className="border px-2 py-1"></td>
                            </tr>
                          )}
                          {[...jlist].sort((a, b) => (a.bln ?? 99) - (b.bln ?? 99)).map((x) => {
                            const it = items.get(x.key);
                            const editing = editId === x.id;
                            return (
                              <tr key={x.id} className="align-top">
                                <td className="border px-2 py-1 text-center">{no++}</td>
                                <td className="border px-2 py-1"></td>
                                <td className="border px-2 py-1 pl-8">• {it ? it.r.Uraian : x.key}{x.bln !== null && <span className="ml-1 text-xs text-muted-foreground">({BLN[x.bln]})</span>}</td>
                                <td className="border px-2 py-1 text-center"><DanaBadge value={it?.r.SumberDana} emptyLabel="-" /></td>
                                <td className="border px-2 py-1 text-center">
                                  {editing ? (
                                    <Input className="h-7 w-20 text-xs" type="number" value={editVol} onChange={(e) => { setEditVol(e.target.value); const v = Number(e.target.value) || 0; setEditAmt(String(Math.round(v * (it?.price ?? 0)))); }} />
                                  ) : (
                                    `${nfInt0(x.vol)} ${it?.r.Satuan || ""}`
                                  )}
                                </td>
                                <td className="border px-2 py-1 num">{editing ? <Input className="h-7 w-28 text-xs" inputMode="decimal" value={editAmt} onChange={(e) => setEditAmt(e.target.value)} /> : nf0(it?.price ?? 0)}</td>
                                <td className="border px-2 py-1 num">{editing ? "" : nf0(x.amt)}</td>
                                <td className="border px-2 py-1 whitespace-nowrap">
                                  {editing ? (
                                    <>
                                      <select className="mr-1 h-7 rounded border bg-background text-xs" value={editBln} onChange={(e) => setEditBln(e.target.value)}>
                                        <option value="">—</option>
                                        {BLN.map((b, i) => <option key={i} value={String(i)}>{b}</option>)}
                                      </select>
                                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={async () => {
                                        const vol = Number(editVol) || 0;
                                        const parsedAmt = parseFloat(editAmt.replace(/\./g, "").replace(",", "."));
                                        const amt = isNaN(parsedAmt) ? Math.round(vol * (it?.price ?? 0)) : Math.round(parsedAmt);
                                        if (vol > 0 && it) {
                                          const usedLain = rows.filter((y) => y.key === x.key && y.id !== x.id);
                                          const usedVolLain = usedLain.reduce((s, y) => s + y.vol, 0);
                                          if (usedVolLain + vol > it.vol + 1e-9) {
                                            await notify({ title: "Volume melebihi sisa", description: `Sisa volume RAB: ${nfInt0(Math.max(0, it.vol - usedVolLain))} ${it.r.Satuan || "unit"}.` });
                                            return;
                                          }
                                          const usedAmtLain = usedLain.reduce((s, y) => s + y.amt, 0);
                                          if (usedAmtLain + amt > it.amt + 1) {
                                            await notify({ title: "Jumlah melebihi sisa", description: `Sisa anggaran RAB: ${rp(Math.max(0, it.amt - usedAmtLain))}.` });
                                            return;
                                          }
                                        }
                                        await idbPut("entries", { ...x, vol, amt, bln: editBln === "" ? null : Number(editBln) });
                                        toast.success("Rencana diperbarui.");
                                        setEditId(null);
                                        await onChanged();
                                      }}>✓</Button>
                                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditId(null)}>Batal</Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => { setEditId(x.id); setEditVol(String(x.vol)); setEditBln(x.bln === null ? "" : String(x.bln)); setEditAmt(String(x.amt)); }}><Pencil className="size-3.5" /></Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Hapus" onClick={async () => { await idbDel("entries", x.id); await onChanged(); toast.success("Rencana dihapus."); }}><Trash2 className="size-3.5" /></Button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
        <tr className="bg-muted font-bold">
          <td colSpan={6} className="border px-2 py-1 text-center text-xs">JUMLAH</td>
          <td className="border px-2 py-1 num">{nf0(filteredTot)}</td>
          <td className="border px-2 py-1"></td>
        </tr>
      </tbody>
    </table>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "habis" }) {
  return (
    <span className={`rounded-md border px-2 py-1 ${tone === "habis" ? "border-destructive/50 text-destructive" : "bg-card"}`}>
      <span className="text-muted-foreground">{label} </span>
      <b>{value}</b>
    </span>
  );
}

function StepDot({ n, aktif, done, label }: { n: number; aktif: boolean; done: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${aktif || done ? "" : "opacity-40"}`}>
      <span className={`flex size-5 items-center justify-center rounded-sm text-xs font-bold ${done ? "bg-primary text-primary-foreground" : aktif ? "border-2 border-primary text-primary" : "border border-muted-foreground text-muted-foreground"}`}>
        {done ? "✓" : n}
      </span>
      {label}
    </span>
  );
}

function blankDoc(scope: string, flat: RabFlatRow[], tables: SmdTables | null): RpdDoc {
  const ident = villageIdentity(tables, flat[0] ? String(flat[0].Tahun) : "");
  return {
    id: newId("d"), scope, name: "RPD baru", judul: "RENCANA PENGGUNAAN DANA", desa: ident.desa, kecamatan: ident.kecamatan,
    tahun: ident.tahun, kades: ident.kades, kaur: ident.kaur, status: "draft",
    tanggal: new Date().toISOString().slice(0, 10), ts: Date.now(), updated: Date.now(),
  };
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-3xl font-medium tabular-nums" title={value}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RpdDocForm({ initial, onSave }: { initial: RpdDoc; onSave: (d: RpdDoc) => Promise<void> }) {
  const [d, setD] = useState<RpdDoc>(initial);
  const set = <K extends keyof RpdDoc>(k: K, v: RpdDoc[K]) => setD({ ...d, [k]: v });
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave({ ...d, updated: Date.now() });
      }}
    >
      <label className="block text-xs">Nama dokumen<Input className="mt-1" value={d.name} onChange={(e) => set("name", e.target.value)} /></label>
      <label className="block text-xs">Judul<Input className="mt-1" value={d.judul} onChange={(e) => set("judul", e.target.value)} /></label>
      <label className="block text-xs">Status
        <select className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={d.status ?? "draft"} onChange={(e) => set("status", e.target.value as DocStatus)}>
          <option value="draft">Draf</option>
          <option value="progress">Berjalan</option>
          <option value="done">Selesai</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs">Desa<Input className="mt-1" value={d.desa} onChange={(e) => set("desa", e.target.value)} /></label>
        <label className="block text-xs">Kecamatan<Input className="mt-1" value={d.kecamatan} onChange={(e) => set("kecamatan", e.target.value)} /></label>
        <label className="block text-xs">Tahun<Input className="mt-1" value={d.tahun} onChange={(e) => set("tahun", e.target.value)} /></label>
        <label className="block text-xs">Tanggal<Input className="mt-1" type="date" value={d.tanggal} onChange={(e) => set("tanggal", e.target.value)} /></label>
        <label className="block text-xs">Kepala Desa<Input className="mt-1" value={d.kades} onChange={(e) => set("kades", e.target.value)} /></label>
        <label className="block text-xs">Kaur / Bendahara<Input className="mt-1" value={d.kaur} onChange={(e) => set("kaur", e.target.value)} /></label>
      </div>
      <Button type="submit" size="sm">Simpan</Button>
    </form>
  );
}


