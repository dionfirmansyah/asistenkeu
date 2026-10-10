import { useEffect, useRef, useState } from "react";
import { rp } from "@/lib/engine/format";
import { download } from "@/lib/csv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";
import { ChevronRight, ChevronDown, Trash2 } from "lucide-react";

const STORE = "asistenkeu_rekon_v2";
interface Dana { id: string; nama: string; saldo: number }
interface Item { jenis: string; uraian: string; bukti: string; tglItem: string; nilai: number; sisi: string; arah: "+" | "-" }
interface Rekon {
  id: string; judul: string; periode: string; bku: number; sumber: Dana[]; brankas: number; items: Item[];
  doc: { desa: string; kec: string; tanggal: string; kades: string; pptkd: string; pemeriksa: string; catatan: string };
}
interface RknState { list: Rekon[]; active: number }

/** Sisi penyesuaian: "bku" = Kas Siskeudes, "fisik" = Kas Bendahara umum, selainnya = id sumber dana. */
const SISI_BKU = "bku";
const SISI_FISIK = "fisik";

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
    sisi: i.sisi ?? SISI_FISIK,
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
  const [ioMsg, setIoMsg] = useState("");
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
      } catch (e) {
        setIoMsg("Gagal impor: " + (e instanceof Error ? e.message : String(e)));
      }
    };
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Rekonsiliasi Kas</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => ioRef.current?.click()}>Impor JSON</Button>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.list.map((x) => {
            const tSumber = x.sumber.reduce((s, d) => s + (Number(d.saldo) || 0), 0);
            let aB = 0, aF = 0;
            for (const i of x.items) {
              const v = i.arah === "+" ? i.nilai : -i.nilai;
              if (i.sisi === SISI_BKU) aB += v; else aF += v;
            }
            const selisih = Math.round(x.bku) + aB - (Math.round(tSumber + x.brankas) + aF);
            return (
              <div key={x.id} className="relative rounded-lg border transition hover:bg-accent">
                <button type="button" onClick={() => { window.location.hash = `/rekon/${x.id}`; }} className="block w-full p-4 text-left">
                  <div className="font-semibold">{x.judul || "Rekonsiliasi"}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Periode {x.periode || "-"} · {x.items.length} item</div>
                  <div className={`mt-1 text-xs font-semibold ${selisih === 0 ? "text-emerald-600" : "text-destructive"}`}>{selisih === 0 ? "COCOK" : `Selisih ${rp(selisih)}`}</div>
                </button>
                <button type="button" title="Hapus rekonsiliasi" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Hapus rekonsiliasi "${x.judul || "ini"}"?`)) setState({ ...state, list: state.list.filter((y) => y.id !== x.id) }); }} className="absolute right-3 top-3 rounded-md border px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Hapus</button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const totalSumber = r.sumber.reduce((s, d) => s + (Number(d.saldo) || 0), 0);
  let adjBku = 0, adjUmum = 0;
  const adjPerSumber = new Map<string, number>();
  for (const i of r.items) {
    const v = i.arah === "+" ? i.nilai : -i.nilai;
    if (i.sisi === SISI_BKU) adjBku += v;
    else if (i.sisi === SISI_FISIK) adjUmum += v;
    else adjPerSumber.set(i.sisi, (adjPerSumber.get(i.sisi) ?? 0) + v);
  }
  const adjFisik = adjUmum + [...adjPerSumber.values()].reduce((s, v) => s + v, 0);
  const bkuAdj = Math.round(r.bku) + adjBku;
  const fisikAdj = Math.round(totalSumber + r.brankas) + adjFisik;
  const selisih = bkuAdj - fisikAdj;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => { window.location.hash = "/rekon"; }}>← Daftar rekonsiliasi</Button>
        <b>{r.judul || "Rekonsiliasi"}</b>
        <span className="ml-auto" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const payload = { tool: "asistenkeu-rekon-backup", version: 1, exportedAt: new Date().toISOString(), list: [r] };
            const nama = (r.judul.trim() || r.id).toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "rekon";
            download(`rekon-${nama}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
          }}
        >
          Ekspor JSON
        </Button>
        <Button size="sm" variant="destructive" onClick={() => { if (!window.confirm(`Hapus rekonsiliasi "${r.judul || "ini"}"?`)) return; setState({ ...state, list: state.list.filter((x) => x.id !== r.id) }); window.location.hash = "/rekon"; }}>Hapus</Button>
      </div>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Identitas rekonsiliasi</CardTitle></CardHeader>
        <CardContent className="grid gap-2 p-3 md:grid-cols-3">
          <label className="text-xs">Judul<Input className="mt-1" value={r.judul} onChange={(e) => set({ judul: e.target.value })} /></label>
          <label className="text-xs">Saldo BKU (Siskeudes)<MoneyInput className="mt-1" value={r.bku} onChange={(n) => set({ bku: n })} /></label>
          <label className="text-xs">Tunai/brankas<MoneyInput className="mt-1" value={r.brankas} onChange={(n) => set({ brankas: n })} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Sumber dana lainnya</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-3">
          <p className="text-xs text-muted-foreground">Kas di luar BKU/brankas — mis. dana talangan, titipan, atau kas tunai lain. Muncul sebagai pilihan di kolom “Mempengaruhi”.</p>
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
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Penyesuaian</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-52" />
              <col />
              <col className="w-40" />
              <col className="w-32" />
              <col className="w-36" />
              <col className="w-10" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th>Jenis item</th>
                <th>Uraian</th>
                <th>Mempengaruhi</th>
                <th>Arah</th>
                <th className="num">Nilai</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {r.items.map((i, idx) => {
                const open = !!detailOpen[idx];
                return (
                <tr key={idx} className="border-t align-top">
                  <td className="py-1 pr-1">
                    <select className="h-8 w-full rounded border bg-background px-1 text-xs" value={i.jenis} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, jenis: e.target.value } : x)) })}>
                      {JENIS_ITEMS.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-1">
                    <div className="flex items-center gap-1">
                      <Input className="h-8 text-xs" value={i.uraian} placeholder="Uraian…" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, uraian: e.target.value } : x)) })} />
                      <Button size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0" title={open ? "Sembunyikan keterangan" : "Tampilkan keterangan (bukti & tanggal)"} onClick={() => setDetailOpen((o) => ({ ...o, [idx]: !o[idx] }))}>
                        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      </Button>
                    </div>
                    {!open && (i.bukti || i.tglItem) && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{[i.bukti, i.tglItem].filter(Boolean).join(" · ")}</div>
                    )}
                    {open && (
                      <div className="mt-1 grid grid-cols-2 gap-1">
                        <Input className="h-8 text-xs" value={i.bukti} placeholder="No bukti (SPP-03/…)" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, bukti: e.target.value } : x)) })} />
                        <Input className="h-8 text-xs" type="date" value={i.tglItem} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, tglItem: e.target.value } : x)) })} />
                      </div>
                    )}
                  </td>
                  <td className="py-1 pr-1">
                    <select className="h-8 w-full rounded border bg-background px-1 text-xs" value={i.sisi === SISI_BKU || i.sisi === SISI_FISIK || r.sumber.some((d) => d.id === i.sisi) ? i.sisi : "__hilang__"} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, sisi: e.target.value } : x)) })}>
                      <option value={SISI_BKU}>Kas Siskeudes</option>
                      <option value={SISI_FISIK}>Kas Bendahara</option>
                      {r.sumber.map((d) => <option key={d.id} value={d.id}>{d.nama.trim() || "(tanpa nama)"}</option>)}
                      {!(i.sisi === SISI_BKU || i.sisi === SISI_FISIK || r.sumber.some((d) => d.id === i.sisi)) && (
                        <option value="__hilang__">(sumber dihapus)</option>
                      )}
                    </select>
                  </td>
                  <td className="py-1 pr-1">
                    <select className="h-8 w-full rounded border bg-background px-1 text-xs" value={i.arah} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, arah: e.target.value as Item["arah"] } : x)) })}>
                      <option value="+">Menambah (+)</option>
                      <option value="-">Mengurangi (−)</option>
                    </select>
                  </td>
                  <td className="py-1 pr-1"><MoneyInput className="h-8 w-full text-right text-xs" value={i.nilai} onChange={(n) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, nilai: n } : x)) })} /></td>
                  <td className="py-1 pr-1"><Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Hapus baris" onClick={() => set({ items: r.items.filter((_, j) => j !== idx) })}><Trash2 className="size-4" /></Button></td>
                </tr>
                );
              })}
              {!r.items.length && <tr><td colSpan={6} className="py-2 text-center text-xs text-muted-foreground">Belum ada penyesuaian.</td></tr>}
              <tr className="border-t font-semibold">
                <td colSpan={4} className="pt-1 text-right text-xs text-muted-foreground">Penyesuaian BKU: {rp(adjBku)} · Penyesuaian fisik: {rp(adjFisik)}</td>
                <td className="num pt-1"></td><td />
              </tr>
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => set({ items: [...r.items, { jenis: JENIS_ITEMS[0], uraian: "", bukti: "", tglItem: "", nilai: 0, sisi: SISI_FISIK, arah: "+" }] })}>+ Baris penyesuaian</Button>
            {r.items.length > 0 && <Button size="sm" variant="outline" onClick={() => window.confirm("Hapus semua penyesuaian?") && set({ items: [] })}>Hapus semua</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Ringkasan</CardTitle></CardHeader>
        <CardContent className="p-3">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-1.5">Saldo BKU (disesuaikan)</td>
                <td className="num py-1.5 font-semibold">{rp(bkuAdj)}</td>
              </tr>
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
              <tr className="border-b">
                <td className="py-1.5">Brankas (tunai)</td>
                <td className="num py-1.5">{rp(r.brankas)}</td>
              </tr>
              <tr className="border-b font-semibold">
                <td className="py-1.5">Total fisik (disesuaikan)</td>
                <td className="num py-1.5">{rp(fisikAdj)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-1.5">Selisih</td>
                <td className={`num py-1.5 ${selisih === 0 ? "text-emerald-600" : "text-destructive"}`}>{selisih === 0 ? "COCOK" : rp(selisih)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
