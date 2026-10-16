import { useEffect, useRef, useState } from "react";
import { rp } from "@/lib/engine/format";
import { download } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { ChevronRight, ChevronDown, Trash2, GripVertical, Printer, Undo2, DatabaseArrowDown, DatabaseArrowUp } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { buildRekonPrintDoc } from "./print";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";

const STORE = "asistenkeu_rekon_v2";
interface Dana { id: string; nama: string; saldo: number }
interface Item { jenis: string; uraian: string; bukti: string; tglItem: string; nilai: number; sisi: string; arah: "+" | "-" }
export interface Rekon {
  id: string; judul: string; periode: string; bku: number; sumber: Dana[]; brankas: number; items: Item[];
  doc: { desa: string; kec: string; tanggal: string; kades: string; pptkd: string; pemeriksa: string; catatan: string };
}
interface RknState { list: Rekon[]; active: number }

/** Sisi penyesuaian: "bku" = Kas Siskeudes (BKU), "brankas" = tunai/brankas bendahara, selainnya = id sumber dana. */
const SISI_BKU = "bku";
const SISI_BRANKAS = "brankas";

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id" + Date.now() + Math.random().toString(16).slice(2));

/** Migrasi data lama (banks tanpa id) ke bentuk baru. */
const normalize = (x: Rekon & { banks?: Array<{ nama: string; saldo: number }> }): Rekon => ({
  ...x,
  sumber: (x.sumber ?? x.banks ?? [{ nama: "", saldo: 0 }]).map((s) => ({
    id: (s as Dana).id ?? uid(),
    nama: s.nama ?? "",
    saldo: Number(s.saldo) || 0,
  })),
  items: (x.items ?? []).map((i) => ({
    jenis: i.jenis ?? JENIS_ITEMS[0],
    uraian: i.uraian ?? "",
    bukti: i.bukti ?? "",
    tglItem: i.tglItem ?? "",
    nilai: Number(i.nilai) || 0,
    // Data lama: "fisik" (kas bendahara umum) kini sama dengan brankas.
    sisi: !i.sisi || i.sisi === "fisik" ? SISI_BRANKAS : i.sisi,
    arah: i.arah === "-" ? "-" : "+",
  })),
});

const JENIS_ITEMS = [
  "Pajak belum disetor",
  "SPP dicetak, uang belum ditarik",
  "Bunga bank belum dicatat",
  "Biaya admin bank belum dicatat",
  "Pajak disetor, belum dipotong di BKU",
  "SPJ diterima, belum dibukukan",
  "Dana talangan dipakai / dikembalikan",
  "Lainnya",
];
const blankRekon = (): Rekon => ({
  id: uid(), judul: "", periode: "",
  bku: 0, sumber: [{ id: uid(), nama: "", saldo: 0 }], brankas: 0, items: [],
  doc: { desa: "", kec: "", tanggal: "", kades: "", pptkd: "", pemeriksa: "", catatan: "" },
});

export default function RekonView() {
  const [state, setState] = useState<RknState>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || "null") as RknState | null;
      if (s && Array.isArray(s.list) && s.list.length) {
        return { list: s.list.map(normalize), active: Math.min(s.active || 0, s.list.length - 1) };
      }
    } catch { /* ignore */ }
    return { list: [], active: 0 };
  });
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* ignore */ } }, [state]);

  // URL: #/rekon/<id> → detail; tanpa id → daftar
  const [docId, setDocId] = useState(() => {
    const parts = window.location.hash.replace(/^#\/?/, "").split("/");
    return parts[0] === "rekon" && parts[1] ? parts[1] : "";
  });
  useEffect(() => {
    const onHash = () => {
      const parts = window.location.hash.replace(/^#\/?/, "").split("/");
      setDocId(parts[0] === "rekon" && parts[1] ? parts[1] : "");
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // Baris yang keterangan tambahannya (bukti & tanggal) sedang dibuka
  const [detailOpen, setDetailOpen] = useState<Record<number, boolean>>({});
  // Seret-urut baris penyesuaian
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [ioMsg, setIoMsg] = useState("");
  const { confirmNode, confirm, notify } = useConfirm();
  const ioRef = useRef<HTMLInputElement>(null);

  const idx = state.list.findIndex((x) => x.id === docId);
  const r = idx >= 0 ? state.list[idx] : null;
  const set = (patch: Partial<Rekon>) => r && setState({ ...state, list: state.list.map((x, i) => (i === idx ? { ...x, ...patch } : x)) });



  if (!docId || !r) {
    // ---- Daftar rekonsiliasi ----
    const imporJson = async (f: File) => {
      setIoMsg("Membaca file backup…");
      try {
        const data: unknown = JSON.parse(await f.text());
        const arr = Array.isArray(data)
          ? data
          : data && typeof data === "object" && Array.isArray((data as { list?: unknown }).list)
            ? (data as { list: unknown[] }).list
            : null;
        if (!arr) throw new Error("Format JSON tidak dikenali (perlu {list:[...]}).");
        const blank = blankRekon();
        const imported = arr.map((x) => {
          if (!x || typeof x !== "object") throw new Error("Ada baris yang rusak.");
          const r = x as Partial<Rekon>;
          return normalize({
            ...blank,
            ...r,
            id: typeof r.id === "string" && r.id ? r.id : uid(),
            doc: { ...blank.doc, ...((r.doc ?? {}) as Rekon["doc"]) },
          });
        });
        const map = new Map(state.list.map((x) => [x.id, x]));
        let tambah = 0, perbarui = 0;
        for (const x of imported) {
          if (map.has(x.id)) perbarui++;
          else tambah++;
          map.set(x.id, x);
        }
        setState({ ...state, list: [...map.values()] });
        setIoMsg(`Impor selesai: ${tambah} baru, ${perbarui} diperbarui (ID sama ditimpa).`);
        toast.success(`Impor selesai — ${tambah} baru, ${perbarui} diperbarui.`);
      } catch (e) {
        const msg = "Gagal impor: " + (e instanceof Error ? e.message : String(e));
        setIoMsg(msg);
        toast.error(msg, { duration: Infinity });
      }
    };
    return (
      <div className="space-y-4">
      {confirmNode}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">Rekonsiliasi kas</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Cocokkan saldo kas riil dengan saldo Siskeudes.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => ioRef.current?.click()}><DatabaseArrowDown/> Impor JSON</Button>
            <input
              ref={ioRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void imporJson(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" onClick={() => { const nr = blankRekon(); setState({ ...state, list: [...state.list, nr] }); window.location.hash = `/rekon/${nr.id}`; }}>Rekonsiliasi baru</Button>
          </div>
        </div>
        {ioMsg && <p className="text-xs text-muted-foreground">{ioMsg}</p>}
        {!state.list.length && (
          <p className="text-sm text-muted-foreground">Belum ada rekonsiliasi. Klik <b>Rekonsiliasi baru</b> untuk membuat.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 ">
          {state.list.map((x) => {
            let aB = 0, aBr = 0;
            for (const i of x.items) {
              const v = i.arah === "+" ? i.nilai : -i.nilai;
              if (i.sisi === SISI_BKU) aB += v; else if (i.sisi === SISI_BRANKAS) aBr += v;
            }
            const selisih = (Math.round(x.bku) + aB) - (Math.round(x.brankas) + aBr);
            return (
              <div key={x.id} className="relative rounded-none border-2 bg-secondary transition hover:bg-accent">
                <button type="button" onClick={() => { window.location.hash = `/rekon/${x.id}`; }} className="block w-full p-4 text-left">
                  <div className="font-semibold">{x.judul || "Rekonsiliasi"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Periode {x.periode || "-"} · {x.items.length} item</div>
                  <div className="mt-2">{selisih === 0 ? <StatusBadge tone="success">Sesuai</StatusBadge> : <StatusBadge tone="destructive">Selisih {rp(selisih)}</StatusBadge>}</div>
                </button>
                <Button size={'icon'} variant={'destructive'} type="button" title="Hapus rekonsiliasi" onClick={async (e) => { e.stopPropagation(); if (!(await confirm({ title: `Hapus rekonsiliasi "${x.judul || "ini"}"?`, tone: "destructive", confirmLabel: "Hapus" }))) return; setState({ ...state, list: state.list.filter((y) => y.id !== x.id) }); toast.success("Rekonsiliasi dihapus."); }} className="absolute right-3 top-3  px-2 py-1 text-xs "><Trash2/></Button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalSumber = r.sumber.reduce((s, d) => s + (Number(d.saldo) || 0), 0);
  let adjBku = 0, adjBrankas = 0;
  const adjPerSumber = new Map<string, number>();
  for (const i of r.items) {
    const v = i.arah === "+" ? i.nilai : -i.nilai;
    if (i.sisi === SISI_BKU) adjBku += v;
    else if (i.sisi === SISI_BRANKAS) adjBrankas += v;
    // Item ke sumber dana lain hanya pelacakan talangan — di luar selisih.
    else adjPerSumber.set(i.sisi, (adjPerSumber.get(i.sisi) ?? 0) + v);
  }
  const bkuAdj = Math.round(r.bku) + adjBku;
  const brankasAdj = Math.round(r.brankas) + adjBrankas;
  // Inti rekonsiliasi: saldo BKU Siskeudes harus sama dengan tunai brankas.
  const selisih = bkuAdj - brankasAdj;

  return (
    <div className="space-y-4">
      {confirmNode}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">{r.judul || "Rekonsiliasi"}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Rincian penyesuaian dan ringkasan selisih kas.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline"  onClick={() => { window.location.hash = "/rekon"; }}><Undo2/></Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const payload = { tool: "asistenkeu-rekon-backup", version: 1, exportedAt: new Date().toISOString(), list: [r] };
              const nama = (r.judul.trim() || r.id).toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "rekon";
              download(`rekon-${nama}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
              toast.success("Berkas JSON terunduh.");
            }}
          >
           <DatabaseArrowUp/>  Ekspor JSON
          </Button>
          <Button size="sm" variant="outline" onClick={async () => {
            const win = window.open("", "_blank");
            if (!win) { await notify({ title: "Popup diblokir", description: "Izinkan popup untuk situs ini agar dokumen bisa dicetak." }); return; }
            win.document.write(buildRekonPrintDoc(r));
            win.document.close();
          }}><Printer className="size-3.5" /> Cetak PDF</Button>
          <Button size="sm" variant="destructive" onClick={async () => { if (!(await confirm({ title: `Hapus rekonsiliasi "${r.judul || "ini"}"?`, description: "Data rekonsiliasi ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return; setState({ ...state, list: state.list.filter((x) => x.id !== r.id) }); window.location.hash = "/rekon"; toast.success("Rekonsiliasi dihapus."); }}>Hapus</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Identitas rekonsiliasi</CardTitle></CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 md:p-5">
          <label className="text-sm font-medium">Judul<Input className="mt-1.5" value={r.judul} onChange={(e) => set({ judul: e.target.value })} /></label>
          <label className="text-sm font-medium">Saldo BKU (Siskeudes)<MoneyInput className="mt-1.5" value={r.bku} onChange={(n) => set({ bku: n })} /></label>
          <label className="text-sm font-medium">Tunai/brankas<MoneyInput className="mt-1.5" value={r.brankas} onChange={(n) => set({ brankas: n })} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Dokumen &amp; tanda tangan</CardTitle></CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 md:p-5">
          <label className="text-sm font-medium">Desa<Input className="mt-1.5" value={r.doc.desa} onChange={(e) => set({ doc: { ...r.doc, desa: e.target.value } })} /></label>
          <label className="text-sm font-medium">Kecamatan<Input className="mt-1.5" value={r.doc.kec} onChange={(e) => set({ doc: { ...r.doc, kec: e.target.value } })} /></label>
          <label className="text-sm font-medium">Tanggal<Input className="mt-1.5" type="date" value={r.doc.tanggal} onChange={(e) => set({ doc: { ...r.doc, tanggal: e.target.value } })} /></label>
          <label className="text-sm font-medium">Kepala Desa<Input className="mt-1.5" value={r.doc.kades} onChange={(e) => set({ doc: { ...r.doc, kades: e.target.value } })} /></label>
          <label className="text-sm font-medium">Dibuat oleh (nama)<Input className="mt-1.5" value={r.doc.pptkd} onChange={(e) => set({ doc: { ...r.doc, pptkd: e.target.value } })} /></label>
          <label className="text-sm font-medium">Pemeriksa (opsional)<Input className="mt-1.5" value={r.doc.pemeriksa} onChange={(e) => set({ doc: { ...r.doc, pemeriksa: e.target.value } })} /></label>
          <label className="text-sm font-medium md:col-span-3">Catatan (opsional)<Input className="mt-1.5" value={r.doc.catatan} onChange={(e) => set({ doc: { ...r.doc, catatan: e.target.value } })} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Sumber dana lainnya</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">Kas di luar BKU/brankas — mis. dana talangan, titipan, atau kas tunai lain. Muncul sebagai pilihan di kolom “Mempengaruhi” dan tercatat di Ringkasan, di luar hitungan selisih.</p>
          {r.sumber.map((d) => (
            <div key={d.id} className="flex gap-2">
              <Input className="h-8 text-xs" placeholder="cth: Dana Talangan" value={d.nama} onChange={(e) => set({ sumber: r.sumber.map((x) => (x.id === d.id ? { ...x, nama: e.target.value } : x)) })} />
              <MoneyInput className="h-8 w-40 text-xs" value={d.saldo} onChange={(n) => set({ sumber: r.sumber.map((x) => (x.id === d.id ? { ...x, saldo: n } : x)) })} />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Hapus sumber dana" onClick={() => set({ sumber: r.sumber.filter((x) => x.id !== d.id) })}><Trash2 className="size-4" /></Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ sumber: [...r.sumber, { id: uid(), nama: "", saldo: 0 }] })}>+ Sumber dana</Button>
          <div className="text-xs text-muted-foreground">Total sumber dana: <b>{rp(totalSumber)}</b></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Penyesuaian</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-4 md:p-5">
          <div className="overflow-x-auto rounded-none border-2">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-52" />
              <col />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="bg-muted text-left">
                <th scope="col" className="h-10 w-10" aria-label="Urutkan" />
                <th scope="col" className="h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Jenis item</th>
                <th scope="col" className="h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Uraian</th>
                <th scope="col" className="h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Mempengaruhi</th>
                <th scope="col" className="h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Arah</th>
                <th scope="col" className="num h-10 px-3 font-mono text-xs font-medium uppercase tracking-[0.06em]">Nilai</th>
                <th scope="col" className="h-10 px-3" />
              </tr>
            </thead>
            <tbody>
              {r.items.map((i, idx) => {
                const open = !!detailOpen[idx];
                const moveItem = (from: number, to: number) => {
                  if (from === to || from < 0 || to < 0 || from >= r.items.length || to >= r.items.length) return;
                  const next = [...r.items];
                  const [x] = next.splice(from, 1);
                  next.splice(to, 0, x);
                  set({ items: next });
                };
                return (
                <tr
                  key={idx}
                  className={`border-b align-top hover:bg-primary/5 ${overIdx === idx ? "bg-primary/10" : ""} ${dragIdx === idx ? "opacity-50" : ""}`}
                  onDragOver={(e) => {
                    if (dragIdx === null || dragIdx === idx) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setOverIdx(idx);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) moveItem(dragIdx, idx);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                >
                  <td className="h-11 w-10 px-1">
                    <span
                      role="button"
                      tabIndex={0}
                      draggable
                      title="Seret untuk mengubah urutan (keyboard: panah atas/bawah)"
                      aria-label={`Ubah urutan baris ${idx + 1}`}
                      onDragStart={(e) => {
                        setDragIdx(idx);
                        setOverIdx(null);
                        e.dataTransfer.effectAllowed = "move";
                        try { e.dataTransfer.setData("text/plain", String(idx)); } catch { /* abaikan */ }
                      }}
                      onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                          e.preventDefault();
                          moveItem(idx, idx + (e.key === "ArrowUp" ? -1 : 1));
                        }
                      }}
                      className="flex h-8 w-8 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent active:cursor-grabbing"
                    >
                      <GripVertical className="size-4" />
                    </span>
                  </td>
                  <td className="h-11 px-3 py-1">
                    <select className="h-8 w-full rounded-md border border-input bg-card px-1 text-sm" value={i.jenis} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, jenis: e.target.value } : x)) })}>
                      {JENIS_ITEMS.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </td>
                  <td className="h-11 px-3 py-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8" value={i.uraian} placeholder="Uraian…" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, uraian: e.target.value } : x)) })} />
                      <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" title={open ? "Sembunyikan keterangan" : "Tampilkan keterangan (bukti & tanggal)"} onClick={() => setDetailOpen((o) => ({ ...o, [idx]: !o[idx] }))}>
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </Button>
                    </div>
                    {!open && (i.bukti || i.tglItem) && (
                      <div className="mt-0.5 text-xs text-muted-foreground">{[i.bukti, i.tglItem].filter(Boolean).join(" · ")}</div>
                    )}
                    {open && (
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        <Input className="h-8" value={i.bukti} placeholder="No bukti (SPP-03/…)" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, bukti: e.target.value } : x)) })} />
                        <Input className="h-8" type="date" value={i.tglItem} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, tglItem: e.target.value } : x)) })} />
                      </div>
                    )}
                  </td>
                  <td className="h-11 px-3 py-1">
                    <select className="h-8 w-full rounded-md border border-input bg-card px-1 text-sm" value={i.sisi === SISI_BKU || i.sisi === SISI_BRANKAS || r.sumber.some((d) => d.id === i.sisi) ? i.sisi : "__hilang__"} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, sisi: e.target.value } : x)) })}>
                      <option value={SISI_BKU}>Kas Siskeudes</option>
                      <option value={SISI_BRANKAS}>Brankas (tunai)</option>
                      {r.sumber.map((d) => <option key={d.id} value={d.id}>{d.nama.trim() || "(tanpa nama)"}</option>)}
                      {!(i.sisi === SISI_BKU || i.sisi === SISI_BRANKAS || r.sumber.some((d) => d.id === i.sisi)) && (
                        <option value="__hilang__">(sumber dihapus)</option>
                      )}
                    </select>
                  </td>
                  <td className="h-11 px-3 py-1">
                    <select className="h-8 w-full rounded-md border border-input bg-card px-1 text-sm" value={i.arah} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, arah: e.target.value as Item["arah"] } : x)) })}>
                      <option value="+">Menambah (+)</option>
                      <option value="-">Mengurangi (−)</option>
                    </select>
                  </td>
                  <td className="h-11 px-3 py-1"><MoneyInput className="h-8 w-full text-right" value={i.nilai} onChange={(n) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, nilai: n } : x)) })} /></td>
                  <td className="h-11 px-3 py-1"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Hapus baris" aria-label="Hapus baris" onClick={() => set({ items: r.items.filter((_, j) => j !== idx) })}><Trash2 className="size-4" /></Button></td>
                </tr>
                );
              })}
              {!r.items.length && <tr><td colSpan={7} className="py-3 text-center text-sm text-muted-foreground">Belum ada penyesuaian.</td></tr>}
              <tr className="border-t bg-muted font-semibold">
                <td />
                <td colSpan={4} className="h-11 px-3 text-right text-xs text-muted-foreground">Penyesuaian BKU: {rp(adjBku)} · Penyesuaian brankas: {rp(adjBrankas)}</td>
                <td className="num h-11 px-3"></td><td />
              </tr>
            </tbody>
          </table>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => set({ items: [...r.items, { jenis: JENIS_ITEMS[0], uraian: "", bukti: "", tglItem: "", nilai: 0, sisi: SISI_BRANKAS, arah: "+" }] })}>+ Baris penyesuaian</Button>
            {r.items.length > 0 && <Button size="sm" variant="outline" onClick={async () => { if (!(await confirm({ title: "Hapus semua penyesuaian?", description: "Seluruh baris penyesuaian ikut terhapus dan tidak bisa dibatalkan.", confirmLabel: "Hapus", tone: "destructive" }))) return; set({ items: [] }); toast.success("Semua penyesuaian dihapus."); }}>Hapus semua</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle>Ringkasan</CardTitle></CardHeader>
        <CardContent className="p-3">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5">
                  Saldo BKU (disesuaikan)
                  {adjBku !== 0 && <span className="ml-2 text-xs text-muted-foreground">({rp(r.bku)} {adjBku > 0 ? "+" : "−"} {rp(Math.abs(adjBku))})</span>}
                </td>
                <td className="num py-1.5 font-semibold">{rp(bkuAdj)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-1.5">
                  Brankas / tunai (disesuaikan)
                  {adjBrankas !== 0 && <span className="ml-2 text-xs text-muted-foreground">({rp(r.brankas)} {adjBrankas > 0 ? "+" : "−"} {rp(Math.abs(adjBrankas))})</span>}
                </td>
                <td className="num py-1.5 font-semibold">{rp(brankasAdj)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-1.5">Selisih</td>
                <td className="num py-1.5">{selisih === 0 ? <StatusBadge tone="success">Sesuai</StatusBadge> : <StatusBadge tone="destructive">Selisih {rp(selisih)}</StatusBadge>}</td>
              </tr>
            </tbody>
          </table>
          {r.sumber.length > 0 && (
            <>
              <div className="mt-3 mb-1 text-xs font-medium text-muted-foreground">Pelacakan sumber dana lainnya (di luar selisih)</div>
              <table className="w-full text-sm">
                <tbody>
                  {r.sumber.map((d) => {
                    const adj = adjPerSumber.get(d.id) ?? 0;
                    return (
                      <tr key={d.id} className="border-b">
                        <td className="py-1.5">
                          {d.nama.trim() || "(tanpa nama)"}
                          {adj !== 0 && <span className="ml-2 text-xs text-muted-foreground">({rp(d.saldo)} {adj > 0 ? "+" : "−"} {rp(Math.abs(adj))})</span>}
                        </td>
                        <td className="num py-1.5">{rp(Math.round(d.saldo) + adj)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
