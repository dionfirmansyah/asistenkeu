import { useEffect, useMemo, useState } from "react";
import { rp } from "@/lib/engine/format";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/money-input";

const STORE = "asistenkeu_pajak_v1";
const RATES_DEFAULT = { ppn: 11, pph22: 1.5, pphKonstruksi: 1.75, pph23: 2, pphSewa: 10, pdnGalian: 20, pdnKonsumsi: 10 };
const RATE_LABELS: Record<string, string> = {
  ppn: "Tarif PPN (%)", pph22: "PPh 22 barang (%)", pphKonstruksi: "PPh Final konstruksi (%)",
  pph23: "PPh 23 jasa (%)", pphSewa: "PPh Final sewa tanah/bangunan (%)", pdnGalian: "Pajak daerah Galian C (%)", pdnKonsumsi: "Pajak daerah konsumsi (%)",
};
const RATE_HINTS: Record<string, string> = {
  ppn: "PPN 12% berlaku bersama DPP nilai lain (11/12) sehingga efektifnya 11% untuk kebanyakan belanja desa — tuliskan 11. Gunakan 12 hanya bila DPP penuh. Tidak dipungut bendahara bila ≤ Rp2 jt (di luar PPN).",
  pph22: "Belanja langsung ke penyedia: 1,5% (PMK 51/2025); via marketplace/Sistem Informasi Pengadaan: 0,5%. Tanpa NPWP tarif naik 100%.",
  pphKonstruksi: "Pekerjaan konstruksi: 1,75% (SBU kecil), 2,65% (menengah/besar/spesialis), 4% (tanpa sertifikat). Tanpa NPWP tarif naik 100%.",
  pph23: "Jasa lainnya: 2% dari bruto bila punya NPWP; tanpa NPWP tarif naik 100%.",
  pphSewa: "Sewa tanah/bangunan: PPh Final 10%; tanpa NPWP tarif naik 100%.",
  pdnGalian: "Pajak daerah (PDRD) Galian C — sesuaikan Perbup. Tidak bergantung NPWP.",
  pdnKonsumsi: "PBJT makanan/minuman maks 10% (UU 1/2022); Kab. Kotabaru 10%. Bukan objek PPN. Tidak bergantung NPWP.",
};
const KATEGORI: Record<string, { label: string; rates: string[]; npwp: boolean }> = {
  barang: { label: "Pembelian Barang", rates: ["ppn", "pph22"], npwp: true },
  konstruksi: { label: "Jasa Konstruksi", rates: ["ppn", "pphKonstruksi"], npwp: true },
  jasa: { label: "Jasa Lainnya", rates: ["ppn", "pph23"], npwp: true },
  sewakendaraan: { label: "Sewa Kendaraan", rates: ["ppn", "pph23"], npwp: true },
  sewatanah: { label: "Sewa Tanah / Bangunan", rates: ["ppn", "pphSewa"], npwp: true },
  konsumsi: { label: "Konsumsi", rates: ["pdnKonsumsi"], npwp: false },
  galian: { label: "Galian C / Material Tambang", rates: ["ppn", "pdnGalian"], npwp: false },
};
const nfDec = (n: number) => String(+Number(n || 0).toFixed(2)).replace(".", ",");
const roundUp100 = (n: number) => { const r = Math.round(n); return r % 100 === 0 ? r : r + (100 - (r % 100)); };

/** Tanggal verifikasi terakhir isi kartu aturan — perbarui manual bila regulasi berubah. */
const ATURAN_UPDATED = "Oktober 2026";

interface Aturan {
  id: string;
  nama: string;
  tarif: string;
  dasar: string[];
  catatan: string[];
}

const ATURAN: Aturan[] = [
  {
    id: "ppn",
    nama: "PPN (Pajak Pertambahan Nilai)",
    tarif: "12% (efektif 11%)",
    dasar: [
      "UU No. 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan (HPP) — PPN 12% mulai 1 Januari 2025.",
      "PMK No. 131/PMK.010/2024 — penyerahan non-mewah memakai DPP nilai lain 11/12 × harga jual, sehingga tarif efektif 12% × 11/12 = 11%.",
    ],
    catatan: [
      "Barang/jasa tergolong mewah (kena PPnBM) memakai DPP penuh → 12% penuh, bukan 11%.",
      "Tidak dipungut bendahara bila pembayaran (di luar PPN) ≤ Rp2 juta dan bukan pecahan (PMK 231/2019) — PPN-nya tetap disetor penjual via faktur pajak.",
      "Kalkulator memakai basis DPP nilai lain — pilih 12% hanya bila DPP penuh.",
    ],
  },
  {
    id: "pph22",
    nama: "PPh Pasal 22 (belanja instansi pemerintah)",
    tarif: "1,5% (langsung) · 0,5% (marketplace)",
    dasar: [
      "PMK No. 51 Tahun 2025 — pembelian barang oleh instansi pemerintah (UP/LS): 1,5% × harga pembelian di luar PPN, tidak final. Berlaku 1 Agustus 2025.",
      "PMK No. 58/PMK.03/2022 — transaksi via Pihak Lain/Sistem Informasi Pengadaan: 0,5% × nilai tagihan di luar PPN.",
    ],
    catatan: [
      "Tanpa NPWP tarif naik 100% (menjadi 3% / 1%).",
      "Dikecualikan: pembayaran ≤ Rp2 juta (tidak dipecah), BBM/listrik/air, dana BOS, gabah/beras.",
      "Disetor dengan SSP atas nama rekanan; dilaporkan via e-Bupot Unifikasi.",
      "Default kalkulator (1,5%) = belanja langsung — ganti ke 0,5% bila via marketplace/Sistem Informasi Pengadaan.",
    ],
  },
  {
    id: "pphKonstruksi",
    nama: "PPh Final Jasa Konstruksi",
    tarif: "1,75% · 2,65% · 4%",
    dasar: [
      "PP No. 51 Tahun 2008 jo. PP No. 40 Tahun 2009 jo. PP No. 9 Tahun 2022 — pekerjaan konstruksi: 1,75% (SBU kualifikasi kecil / SKK perseorangan), 2,65% (menengah/besar/spesialis), 4% (tanpa sertifikat).",
    ],
    catatan: [
      "Tanpa NPWP tarif naik 100%.",
      "Default kalkulator (1,75%) = kualifikasi kecil — sesuaikan 2,65%/4% bila kualifikasi berbeda.",
    ],
  },
  {
    id: "pph23",
    nama: "PPh Pasal 23 (jasa)",
    tarif: "2% (4% tanpa NPWP)",
    dasar: [
      "Pasal 23 UU PPh jo. PMK No. 141/PMK.03/2015 — imbalan jasa (termasuk sewa kendaraan selain tanah/bangunan): 2% × bruto.",
    ],
    catatan: [
      "Tanpa NPWP tarif naik 100% (menjadi 4%).",
      "Untuk dividen/bunga/royalti tarifnya 15% — tidak tercakup kalkulator ini.",
    ],
  },
  {
    id: "pphSewa",
    nama: "PPh Final Sewa Tanah / Bangunan",
    tarif: "10% final (20% tanpa NPWP)",
    dasar: [
      "PP No. 34 Tahun 2017 — penghasilan dari persewaan tanah dan/atau bangunan: 10% final × bruto.",
    ],
    catatan: [
      "Tanpa NPWP dipotong 2× (20%).",
      "Bersifat final — tidak dapat dikreditkan di SPT tahunan penerima.",
    ],
  },
  {
    id: "pdnGalian",
    nama: "Pajak Daerah — Mineral Bukan Logam & Batuan (Galian C)",
    tarif: "maks 20% (ikut Perda/Perbup)",
    dasar: [
      "UU No. 1 Tahun 2022 tentang HKPD — pajak MBLB (dulu Galian C) ditetapkan Perda dengan tarif paling tinggi 20%.",
    ],
    catatan: [
      "Default kalkulator (20%) = pagu maksimal — sesuaikan dengan Perbup setempat.",
      "Tidak bergantung status NPWP.",
    ],
  },
  {
    id: "pdnKonsumsi",
    nama: "Pajak Daerah — Konsumsi / Makan-Minum (PBJT)",
    tarif: "10%",
    dasar: [
      "UU No. 1 Tahun 2022 tentang HKPD — PBJT atas makanan dan/atau minuman ditetapkan Perda dengan tarif paling tinggi 10%.",
    ],
    catatan: [
      "Jasa boga/katering dan restoran bukan objek PPN — hanya kena pajak daerah.",
      "Kab. Kotabaru memakai 10%; sesuaikan bila tarif Perda setempat berbeda.",
      "Tidak bergantung status NPWP.",
    ],
  },
];

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
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-primary">Kalkulator pajak</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Simulasi potongan pajak belanja desa sesuai tarif terbaru.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="p-4 pb-1 md:p-5 md:pb-1"><CardTitle>Kalkulator pajak</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4 md:p-5">
          <label className="block text-sm font-medium">Uraian
            <Input className="mt-1.5" value={s.uraian} onChange={(e) => setS({ ...s, uraian: e.target.value })} />
          </label>
          <label className="block text-sm font-medium">Kategori
            <Select value={s.kat} onValueChange={(v) => setS({ ...s, kat: v ?? s.kat })}>
              <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(KATEGORI).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="block text-sm font-medium">Nilai belanja (Rp)
            <MoneyInput className="mt-1.5" value={nilai} onChange={(n) => setS({ ...s, nilai: n ? String(n) : "" })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">Status NPWP
              <Select value={s.npwp} onValueChange={(v) => setS({ ...s, npwp: v ?? s.npwp })} disabled={!kat.npwp}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ya">Punya NPWP</SelectItem>
                  <SelectItem value="tidak">Tidak punya NPWP</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="block text-sm font-medium">Basis PPN
              <Select value={s.ppnBasis} onValueChange={(v) => setS({ ...s, ppnBasis: (v as "excl" | "incl") ?? s.ppnBasis })}>
                <SelectTrigger className="mt-1.5 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="excl">Belum termasuk PPN</SelectItem>
                  <SelectItem value="incl">Sudah termasuk PPN</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="space-y-3 border-t pt-3">
            <div className="text-sm font-semibold">Tarif (dapat disesuaikan)</div>
            {kat.rates.map((k) => (
              <label key={k} className="block text-sm font-medium">
                {RATE_LABELS[k]}
                <Input className="mt-1.5" type="number" step="0.01" value={s.rates[k]} onChange={(e) => setS({ ...s, rates: { ...s.rates, [k]: Number(e.target.value) || 0 } })} />
                <div className="mt-1 text-xs text-muted-foreground">{RATE_HINTS[k]}</div>
              </label>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setS({ ...s, rates: { ...RATES_DEFAULT } })}>Kembalikan tarif default</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 pb-1 md:p-5 md:pb-1"><CardTitle>Simulasi potongan pajak</CardTitle></CardHeader>
        <CardContent className="space-y-1 p-4 font-mono text-xs md:p-5">
          {!nilai && <p className="text-muted-foreground">Ketik nilai belanja di atas untuk melihat simulasi potongan pajak.</p>}
          {!!nilai && (
            <>
              <div>Uraian&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {s.uraian || "-"}</div>
              <div>Kategori&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {kat.label}</div>
              <div>Nilai belanja&nbsp;: {rp(nilai)}</div>
              <div>Status NPWP&nbsp;&nbsp;: {s.kat === "konsumsi" ? "tidak berlaku" : s.kat === "galian" ? "tidak berlaku" : s.npwp === "ya" ? "Punya NPWP" : "Tidak punya NPWP"}</div>
              <hr className="my-1" />
              {lines.map((l, i) => <div key={i}>{l.ket} : {rp(l.amt)}</div>)}
              {s.kat === "konsumsi" && <div>(Konsumsi tidak kena PPN/PPh — hanya pajak daerah)</div>}
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

      <Card>
        <CardHeader className="p-3 pb-1">
          <CardTitle>Dasar aturan penarikan pajak</CardTitle>
          <p className="text-xs text-muted-foreground">
            Ringkas per {ATURAN_UPDATED} — bukan nasihat hukum. Tarif mengikuti peraturan saat transaksi;
            verifikasi ke pajak.go.id / peraturan.go.id bila ragu.
          </p>
        </CardHeader>
        <CardContent className="space-y-2 p-3">
          {ATURAN.map((a) => {
            const dipakai = kat.rates.includes(a.id);
            return (
              <details key={a.id} className={`rounded-md border ${dipakai ? "border-primary/50 bg-primary/5" : ""}`}>
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="font-medium">{a.nama}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{a.tarif}</span>
                  {dipakai && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      Dipakai simulasi ini
                    </span>
                  )}
                </summary>
                <div className="space-y-2 border-t px-3 py-2 text-xs">
                  <div>
                    <div className="font-semibold">Dasar hukum</div>
                    <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                      {a.dasar.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold">Catatan</div>
                    <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                      {a.catatan.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                </div>
              </details>
            );
          })}
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
  const ppnRate = Number(R.ppn) || 0;
  // Uji batas Rp2 juta memakai nilai DI LUAR PPN (PMK 231/2019).
  const dppUji = s.ppnBasis !== "incl" || !ppnRate ? nilai : Math.round(nilai / (1 + ppnRate / 100));
  // Pembayaran (di luar PPN) ≤ Rp2 juta dan bukan pecahan tidak dipungut
  // PPN/PPnBM maupun PPh 22 oleh bendahara. PPN tetap terutang & disetor penjual.
  const bebasPungut = nilai > 0 && dppUji <= 2000000;
  const ppn = () => {
    if (bebasPungut) {
      return {
        label: `PPN ${nfDec(ppnRate)}%`,
        ket: `PPN ${nfDec(ppnRate)}% tidak dipungut bendahara — disetor penjual (DPP ≤ Rp2 jt)`,
        amt: 0,
      };
    }
    return mk("PPN", "ppn", { ppnBasis: true });
  };
  if (kat === "barang") {
    if (bebasPungut) {
      return [ppn(), { label: "PPh 22", ket: "PPh 22 dikecualikan — belanja ≤ Rp2.000.000 dan bukan pecahan", amt: 0 }];
    }
    return [ppn(), mk("PPh 22", "pph22", { dbl: true })];
  }
  if (kat === "konstruksi") return [ppn(), mk("PPh Final", "pphKonstruksi", { dbl: true })];
  if (kat === "jasa" || kat === "sewakendaraan") return [ppn(), mk("PPh 23", "pph23", { dbl: true })];
  if (kat === "sewatanah") return [ppn(), mk("PPh Final", "pphSewa", { dbl: true })];
  if (kat === "galian") return [ppn(), mk("Pajak Daerah", "pdnGalian")];
  if (kat === "konsumsi") return [mk("Pajak Daerah", "pdnKonsumsi")];
  return [ppn()];
}
