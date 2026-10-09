import { useEffect, useState } from "react";
import { rp } from "@/lib/engine/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/money-input";

const STORE = "asistenkeu_rekon_v2";
interface Bank { nama: string; saldo: number }
interface Item { jenis: string; uraian: string; bukti: string; tglItem: string; nilai: number; sisi: "fisik" | "bku"; arah: "+" | "-" }
interface Rekon {
  id: string; judul: string; periode: string; bku: number; banks: Bank[]; brankas: number; items: Item[];
  doc: { desa: string; kec: string; tanggal: string; kades: string; pptkd: string; pemeriksa: string; catatan: string };
}
interface RknState { list: Rekon[]; active: number }

const JENIS_ITEMS = [
  "Pajak belum disetor",
  "SPP dicetak, uang belum ditarik",
  "Bunga bank belum dicatat",
  "Biaya admin bank belum dicatat",
  "Pajak disetor, belum dipotong di BKU",
  "SPJ diterima, belum dibukukan",
  "Lainnya",
];
const blankRekon = (): Rekon => ({
  id: crypto.randomUUID ? crypto.randomUUID() : "rkn" + Date.now(), judul: "", periode: "",
  bku: 0, banks: [{ nama: "", saldo: 0 }], brankas: 0, items: [],
  doc: { desa: "", kec: "", tanggal: "", kades: "", pptkd: "", pemeriksa: "", catatan: "" },
});

export default function RekonView() {
  const [state, setState] = useState<RknState>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORE) || "null");
      if (s && Array.isArray(s.list) && s.list.length) return { list: s.list, active: Math.min(s.active || 0, s.list.length - 1) };
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

  const idx = state.list.findIndex((x) => x.id === docId);
  const r = idx >= 0 ? state.list[idx] : null;
  const set = (patch: Partial<Rekon>) => r && setState({ ...state, list: state.list.map((x, i) => (i === idx ? { ...x, ...patch } : x)) });



  if (!docId || !r) {
    // ---- Daftar rekonsiliasi ----
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Rekonsiliasi Kas</h2>
          <Button size="sm" onClick={() => { const nr = blankRekon(); setState({ ...state, list: [...state.list, nr] }); window.location.hash = `/rekon/${nr.id}`; }}>Rekonsiliasi baru</Button>
        </div>
        {!state.list.length && (
          <p className="text-sm text-muted-foreground">Belum ada rekonsiliasi. Klik <b>Rekonsiliasi baru</b> untuk membuat.</p>
        )}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {state.list.map((x) => {
            const tb = x.banks.reduce((s, b) => s + (Number(b.saldo) || 0), 0);
            let aB = 0, aF = 0;
            for (const i of x.items) {
              const v = i.arah === "+" ? i.nilai : -i.nilai;
              if (i.sisi === "bku") aB += v; else aF += v;
            }
            const selisih = Math.round(x.bku) + aB - (Math.round(tb + x.brankas) + aF);
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

  const totalBank = r.banks.reduce((s, b) => s + (Number(b.saldo) || 0), 0);
  let adjBku = 0, adjFisik = 0;
  for (const i of r.items) {
    const v = i.arah === "+" ? i.nilai : -i.nilai;
    if (i.sisi === "bku") adjBku += v; else adjFisik += v;
  }
  const bkuAdj = Math.round(r.bku) + adjBku;
  const fisikAdj = Math.round(totalBank + r.brankas) + adjFisik;
  const selisih = bkuAdj - fisikAdj;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => { window.location.hash = "/rekon"; }}>← Daftar rekonsiliasi</Button>
        <b>{r.judul || "Rekonsiliasi"}</b>
        <Button size="sm" variant="destructive" onClick={() => { if (!window.confirm(`Hapus rekonsiliasi "${r.judul || "ini"}"?`)) return; setState({ ...state, list: state.list.filter((x) => x.id !== r.id) }); window.location.hash = "/rekon"; }}>Hapus</Button>
      </div>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Identitas rekonsiliasi</CardTitle></CardHeader>
        <CardContent className="grid gap-2 p-3 md:grid-cols-3">
          <label className="text-xs">Judul<Input className="mt-1" value={r.judul} onChange={(e) => set({ judul: e.target.value })} /></label>
          <label className="text-xs">Periode<Input className="mt-1" value={r.periode} onChange={(e) => set({ periode: e.target.value })} /></label>
          <label className="text-xs">Saldo BKU (Siskeudes)<MoneyInput className="mt-1" value={r.bku} onChange={(n) => set({ bku: n })} /></label>
          <label className="text-xs">Tunai/brankas<MoneyInput className="mt-1" value={r.brankas} onChange={(n) => set({ brankas: n })} /></label>
          <label className="text-xs">Desa (doc)<Input className="mt-1" value={r.doc.desa} onChange={(e) => set({ doc: { ...r.doc, desa: e.target.value } })} /></label>
          <label className="text-xs">Kecamatan<Input className="mt-1" value={r.doc.kec} onChange={(e) => set({ doc: { ...r.doc, kec: e.target.value } })} /></label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Rekening bank</CardTitle></CardHeader>
        <CardContent className="space-y-2 p-3">
          {r.banks.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input className="h-8 text-xs" placeholder="Nama bank" value={b.nama} onChange={(e) => set({ banks: r.banks.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)) })} />
              <MoneyInput className="h-8 w-40 text-xs" value={b.saldo} onChange={(n) => set({ banks: r.banks.map((x, j) => (j === i ? { ...x, saldo: n } : x)) })} />
              <Button size="sm" variant="ghost" onClick={() => set({ banks: r.banks.filter((_, j) => j !== i) })}>×</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ banks: [...r.banks, { nama: "", saldo: 0 }] })}>+ Bank</Button>
          <div className="text-xs text-muted-foreground">Total bank: <b>{rp(totalBank)}</b></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Item menggantung (input langsung seperti Excel)</CardTitle></CardHeader>
        <CardContent className="p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th>Jenis item</th>
                <th>Uraian</th>
                <th>No bukti</th>
                <th>Tanggal</th>
                <th>Mempengaruhi</th>
                <th>Arah</th>
                <th className="num">Nilai</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {r.items.map((i, idx) => (
                <tr key={idx} className="border-t">
                  <td className="py-1 pr-1">
                    <select className="h-8 w-56 rounded border bg-background px-1 text-xs" value={i.jenis} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, jenis: e.target.value } : x)) })}>
                      {JENIS_ITEMS.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-1"><Input className="h-8 text-xs" value={i.uraian} placeholder="Uraian…" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, uraian: e.target.value } : x)) })} /></td>
                  <td className="py-1 pr-1"><Input className="h-8 w-32 text-xs" value={i.bukti} placeholder="SPP-03/…" onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, bukti: e.target.value } : x)) })} /></td>
                  <td className="py-1 pr-1"><Input className="h-8 w-32 text-xs" type="date" value={i.tglItem} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, tglItem: e.target.value } : x)) })} /></td>
                  <td className="py-1 pr-1">
                    <select className="h-8 rounded border bg-background px-1 text-xs" value={i.sisi} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, sisi: e.target.value as Item["sisi"] } : x)) })}>
                      <option value="bku">Kas Siskeudes</option>
                      <option value="fisik">Kas Bendahara</option>
                    </select>
                  </td>
                  <td className="py-1 pr-1">
                    <select className="h-8 rounded border bg-background px-1 text-xs" value={i.arah} onChange={(e) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, arah: e.target.value as Item["arah"] } : x)) })}>
                      <option value="+">Menambah (+)</option>
                      <option value="-">Mengurangi (−)</option>
                    </select>
                  </td>
                  <td className="py-1 pr-1"><MoneyInput className="h-8 w-32 text-right text-xs" value={i.nilai} onChange={(n) => set({ items: r.items.map((x, j) => (j === idx ? { ...x, nilai: n } : x)) })} /></td>
                  <td className="py-1 pr-1"><Button size="sm" variant="ghost" onClick={() => set({ items: r.items.filter((_, j) => j !== idx) })}>×</Button></td>
                </tr>
              ))}
              {!r.items.length && <tr><td colSpan={8} className="py-2 text-center text-xs text-muted-foreground">Belum ada item menggantung.</td></tr>}
              <tr className="border-t font-semibold">
                <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">Penyesuaian BKU: {rp(adjBku)} · Penyesuaian fisik: {rp(adjFisik)}</td>
                <td className="num pt-1"></td><td />
              </tr>
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={() => set({ items: [...r.items, { jenis: JENIS_ITEMS[0], uraian: "", bukti: "", tglItem: "", nilai: 0, sisi: "fisik", arah: "+" }] })}>+ Baris item</Button>
            {r.items.length > 0 && <Button size="sm" variant="outline" onClick={() => window.confirm("Hapus semua item menggantung?") && set({ items: [] })}>Hapus semua</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-3 gap-2 p-3 text-sm">
          <div><div className="text-xs text-muted-foreground">Saldo BKU (disesuaikan)</div><div className="font-semibold">{rp(bkuAdj)}</div></div>
          <div><div className="text-xs text-muted-foreground">Fisik (bank + brankas, disesuaikan)</div><div className="font-semibold">{rp(fisikAdj)}</div></div>
          <div><div className="text-xs text-muted-foreground">Selisih</div><div className={`font-semibold ${selisih === 0 ? "text-emerald-600" : "text-destructive"}`}>{selisih === 0 ? "COCOK" : rp(selisih)}</div></div>
        </CardContent>
      </Card>
    </div>
  );
}
