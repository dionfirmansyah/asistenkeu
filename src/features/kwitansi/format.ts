import type { KwitansiData } from "./types";

const KATA = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];

/** Kelompokkan ribuan manual (tanpa toLocaleString) agar konsisten lintas browser. */
function grupRibuan(n: number): string {
  const s = String(Math.abs(Math.trunc(n)));
  let out = "";
  let i = s.length;
  while (i > 3) {
    i -= 3;
    out = "." + s.slice(i, i + 3) + out;
  }
  return s.slice(0, i) + out;
}

/** Rupiah: 7350000 -> "7.350.000,00". Selalu dua desimal. */
export function rupiah(n: number): string {
  const v = Number.isFinite(n) ? Math.trunc(n) : 0;
  return (v < 0 ? "-" : "") + grupRibuan(v) + ",00";
}

function diBawahSeribu(n: number): string {
  let s = "";
  const r = n % 100;
  const h = Math.floor(n / 100);
  if (h > 0) s += h === 1 ? "Seratus" : KATA[h] + " Ratus";
  if (r > 0) {
    if (s) s += " ";
    if (r < 10) s += KATA[r];
    else if (r < 20) s += r === 10 ? "Sepuluh" : r === 11 ? "Sebelas" : KATA[r - 10] + " Belas";
    else {
      s += KATA[Math.floor(r / 10)] + " Puluh";
      if (r % 10) s += " " + KATA[r % 10];
    }
  }
  return s;
}

function sebut(n: number): string {
  if (n < 1000) return diBawahSeribu(n);
  if (n < 1000000) {
    const t = Math.floor(n / 1000);
    const sisa = n % 1000;
    return (t === 1 ? "Seribu" : diBawahSeribu(t) + " Ribu") + (sisa ? " " + diBawahSeribu(sisa) : "");
  }
  if (n < 1000000000) {
    const j = Math.floor(n / 1000000);
    const sisa = n % 1000000;
    return diBawahSeribu(j) + " Juta" + (sisa ? " " + sebut(sisa) : "");
  }
  if (n < 1000000000000) {
    const m = Math.floor(n / 1000000000);
    const sisa = n % 1000000000;
    return diBawahSeribu(m) + " Miliar" + (sisa ? " " + sebut(sisa) : "");
  }
  const t = Math.floor(n / 1000000000000);
  const sisa = n % 1000000000000;
  return diBawahSeribu(t) + " Triliun" + (sisa ? " " + sebut(sisa) : "");
}

/** Terbilang: 7350000 -> "Tujuh Juta Tiga Ratus Lima Puluh Ribu Rupiah". */
export function terbilang(n: number): string {
  const v = Number.isFinite(n) ? Math.trunc(Math.abs(n)) : 0;
  if (v === 0) return "Nol Rupiah";
  return sebut(v) + " Rupiah";
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-03-17" + kota -> "LANGKANG LAMA, 17 Maret 2026". */
export function tanggalIndonesia(iso: string, kota: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  if (!m) return kota ? `${kota}, ${iso}` : iso;
  const hari = parseInt(m[3], 10);
  const bulan = BULAN[parseInt(m[2], 10) - 1] || m[2];
  return `${kota}, ${hari} ${bulan} ${m[1]}`;
}

/** "2026-10-08T19:03:19" -> "08/10/2026 19.03.19". Dipakai apa adanya, tanpa konversi zona. */
export function stempelCetak(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return iso || "";
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}.${m[5]}.${m[6]}`;
}

/** Dibayarkan = jumlah - ppn - pph - lainnya. Dihitung komponen, bukan dari props. */
export function dibayarkan(d: KwitansiData): number {
  return d.jumlah - d.potongan.ppn - d.potongan.pph - d.potongan.lainnya;
}
