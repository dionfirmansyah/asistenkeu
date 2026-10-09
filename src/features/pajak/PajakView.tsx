import { useEffect, useMemo, useState } from "react";
import { rp } from "@/lib/engine/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";

const STORE = "asistenkeu_pajak_v1";
const RATES_DEFAULT = { ppn: 11, pph22: 0.5, pphKonstruksi: 2, pph23: 2, pphSewa: 10, pdnGalian: 20 };
const RATE_LABELS: Record<string, string> = {
  ppn: "Tarif PPN (%)", pph22: "PPh 22 barang (%)", pphKonstruksi: "PPh Final konstruksi (%)",
  pph23: "PPh 23 jasa (%)", pphSewa: "PPh Final sewa tanah/bangunan (%)", pdnGalian: "Pajak daerah Galian C (%)",
};
const RATE_HINTS: Record<string, string> = {
  ppn: "PPN 12% berlaku bersama DPP nilai lain (11/12) sehingga efektifnya 11% untuk kebanyakan belanja desa — tuliskan 11. Gunakan 12 hanya bila DPP penuh.",
  pph22: "Barang: 0,5% bila penerima punya NPWP; tanpa NPWP tarif naik 100%.",
  pphKonstruksi: "Jasa konstruksi: PPh Final 2% bila punya NPWP; tanpa NPWP tarif naik 100%.",
  pph23: "Jasa lainnya: 2% dari bruto bila punya NPWP; tanpa NPWP tarif naik 100%.",
  pphSewa: "Sewa tanah/bangunan: PPh Final 10%; tanpa NPWP tarif naik 100%.",
  pdnGalian: "Pajak daerah (PDRD) Galian C — sesuaikan Perbup. Tidak bergantung NPWP.",
};
const KATEGORI: Record<string, { label: string; rates: string[]; npwp: boolean }> = {
  barang: { label: "Pembelian Barang", rates: ["ppn", "pph22"], npwp: true },
  konstruksi: { label: "Jasa Konstruksi", rates: ["ppn", "pphKonstruksi"], npwp: true },
  jasa: { label: "Jasa Lainnya", rates: ["ppn", "pph23"], npwp: true },
  sewakendaraan: { label: "Sewa Kendaraan", rates: ["ppn", "pph23"], npwp: true },
  sewatanah: { label: "Sewa Tanah / Bangunan", rates: ["ppn", "pphSewa"], npwp: true },
  konsumsi: { label: "Konsumsi", rates: ["ppn"], npwp: false },
  galian: { label: "Galian C / Material Tambang", rates: ["ppn", "pdnGalian"], npwp: false },
};
const nfDec = (n: number) => String(+Number(n || 0).toFixed(2)).replace(".", ",");
const roundUp100 = (n: number) => { const r = Math.round(n); return r % 100 === 0 ? r : r + (100 - (r % 100)); };

interface PjkState {
  kat: string; npwp: string; nilai: string; uraian: string; ppnBasis: "excl" | "incl";
  rates: Record<string, number>;
}

export default function PajakView() {
  const [s, setS] = useState<PjkState>(() => {
    const def: PjkState = { kat: "barang", npwp: "ya", nilai: "", uraian: "", ppnBasis: "excl", rates: { ...RATES_DEFAULT } };
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || "null");
      if (saved && saved.rates) return { ...def, ...saved, rates: { ...RATES_DEFAULT, ...saved.rates } };
    } catch { /* ignore */ }
    return def;
  });
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);

  const nilai = Number(s.nilai.replace(/[^0-9]/g, "")) || 0;
  const lines = useMemo(() => compute(s, nilai), [s, nilai]);
  const pot = lines.reduce((a, l) => a + l.amt, 0);
  const potBulat = lines.reduce((a, l) => a + roundUp100(l.amt), 0);
  const kat = KATEGORI[s.kat];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Kalkulator Pajak</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-3">
          <label className="block text-xs">Uraian
            <Input className="mt-1" value={s.uraian} onChange={(e) => setS({ ...s, uraian: e.target.value })} />
          </label>
          <label className="block text-xs">Kategori
            <Select value={s.kat} onValueChange={(v) => setS({ ...s, kat: v ?? s.kat })}>
              <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(KATEGORI).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block text-xs">Nilai belanja (Rp)
            <MoneyInput className="mt-1" value={nilai} onChange={(n) => setS({ ...s, nilai: n ? String(n) : "" })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs">Status NPWP
              <Select value={s.npwp} onValueChange={(v) => setS({ ...s, npwp: v ?? s.npwp })} disabled={!kat.npwp}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ya">Punya NPWP</SelectItem>
                  <SelectItem value="tidak">Tidak punya NPWP</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block text-xs">Basis PPN
              <Select value={s.ppnBasis} onValueChange={(v) => setS({ ...s, ppnBasis: (v as "excl" | "incl") ?? s.ppnBasis })}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excl">Belum termasuk PPN</SelectItem>
                  <SelectItem value="incl">Sudah termasuk PPN</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="space-y-2 border-t pt-2">
            <div className="text-xs font-semibold">Tarif (dapat disesuaikan)</div>
            {kat.rates.map((k) => (
              <label key={k} className="block text-xs">
                {RATE_LABELS[k]}
                <Input className="mt-1" type="number" step="0.01" value={s.rates[k]} onChange={(e) => setS({ ...s, rates: { ...s.rates, [k]: Number(e.target.value) || 0 } })} />
                <div className="text-[10px] text-muted-foreground">{RATE_HINTS[k]}</div>
              </label>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setS({ ...s, rates: { ...RATES_DEFAULT } })}>Kembalikan tarif default</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 pb-1"><CardTitle className="text-sm">Simulasi potongan pajak</CardTitle></CardHeader>
        <CardContent className="space-y-1 p-3 font-mono text-xs">
          {!nilai && <p className="text-muted-foreground">Ketik nilai belanja di atas untuk melihat simulasi potongan pajak.</p>}
          {!!nilai && (
            <>
              <div>Uraian&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {s.uraian || "-"}</div>
              <div>Kategori&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {kat.label}</div>
              <div>Nilai belanja&nbsp;: {rp(nilai)}</div>
              <div>Status NPWP&nbsp;&nbsp;: {s.kat === "konsumsi" ? "tidak berlaku" : s.kat === "galian" ? "tidak berlaku" : s.npwp === "ya" ? "Punya NPWP" : "Tidak punya NPWP"}</div>
              <hr className="my-1" />
              {lines.map((l, i) => <div key={i}>{l.ket} : {rp(l.amt)}</div>)}
              {s.kat === "konsumsi" && <div>(Konsumsi tidak dipotong PPh)</div>}
              <hr className="my-1" />
              <div className="font-semibold">Total potongan&nbsp;&nbsp;: {rp(pot)}</div>
              <div className="font-semibold">Dibayarkan&nbsp;&nbsp;&nbsp;&nbsp;: {rp(nilai - pot)}</div>
              {potBulat !== pot && (
                <>
                  <hr className="my-1" />
                  <div className="text-muted-foreground">Saran pembulatan (kelipatan Rp100):</div>
                  {lines.map((l, i) => <div key={i}>{l.label} : {rp(roundUp100(l.amt))}</div>)}
                  <div className="font-semibold">Total dibulatkan : {rp(potBulat)}</div>
                  <div className="font-semibold">Dibayarkan&nbsp;&nbsp;&nbsp;&nbsp;: {rp(nilai - potBulat)}</div>
                  <div className="text-muted-foreground">Selisih pembulatan: {rp(potBulat - pot)}</div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function compute(s: PjkState, nilai: number) {
  const kat = s.kat;
  const npwp = s.npwp;
  const R = s.rates;
  const rateOf = (key: string, dbl: boolean) => {
    const base = Number(R[key]) || 0;
    return dbl && npwp === "tidak" ? base * 2 : base;
  };
  const ppnDpp = (rate: number) => (s.ppnBasis !== "incl" || !rate ? nilai : Math.round(nilai / (1 + rate / 100)));
  const mk = (nama: string, rateKey: string, opt: { dbl?: boolean; ppnBasis?: boolean } = {}) => {
    const rate = rateOf(rateKey, !!opt.dbl);
    const basis = opt.ppnBasis ? ppnDpp(rate) : nilai;
    const lbl = opt.dbl && npwp === "tidak" ? `${nama} ${nfDec(rate)}% (tanpa NPWP)` : `${nama} ${nfDec(rate)}%`;
    const ket = opt.ppnBasis && s.ppnBasis === "incl" ? `${lbl} — DPP ${rp(basis)}` : lbl;
    return { label: lbl, ket, amt: Math.round((basis * rate) / 100) };
  };
  const ppn = () => mk("PPN", "ppn", { ppnBasis: true });
  if (kat === "barang") return [ppn(), mk("PPh 22", "pph22", { dbl: true })];
  if (kat === "konstruksi") return [ppn(), mk("PPh Final", "pphKonstruksi", { dbl: true })];
  if (kat === "jasa" || kat === "sewakendaraan") return [ppn(), mk("PPh 23", "pph23", { dbl: true })];
  if (kat === "sewatanah") return [ppn(), mk("PPh Final", "pphSewa", { dbl: true })];
  if (kat === "galian") return [ppn(), mk("Pajak Daerah", "pdnGalian")];
  return [ppn()];
}
